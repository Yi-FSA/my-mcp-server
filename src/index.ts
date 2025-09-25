import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'
import dotenv from 'dotenv'

dotenv.config()

// Create server instance
const server = new McpServer({
    name: 'Greeting MCP Server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
})

// 인사하기 Tool 추가
server.tool('greeting', '사용자에게 인사를 하는 도구입니다.', {
    name: z.string().describe('인사할 대상의 이름'),
    language: z.enum(['korean', 'english', 'japanese']).optional().describe('인사 언어 (기본: korean)')
}, async (args) => {
    const { name, language = 'korean' } = args;
    
    let greeting: string;
    
    switch (language) {
        case 'english':
            greeting = `Hello, ${name}! Nice to meet you!`;
            break;
        case 'japanese':
            greeting = `こんにちは、${name}さん！はじめまして！`;
            break;
        case 'korean':
        default:
            greeting = `안녕하세요, ${name}님! 만나서 반갑습니다!`;
            break;
    }
    
    return {
        content: [
            {
                type: 'text',
                text: greeting
            }
        ]
    };
});

// 계산기 Tool 추가
server.tool('calculator', '사칙연산을 수행하는 계산기 도구입니다.', {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('연산 유형 (add: 덧셈, subtract: 뺄셈, multiply: 곱셈, divide: 나눗셈)'),
    a: z.number().describe('첫 번째 숫자'),
    b: z.number().describe('두 번째 숫자')
}, async (args) => {
    const { operation, a, b } = args;
    
    let result: number;
    let operationSymbol: string;
    let operationName: string;
    
    switch (operation) {
        case 'add':
            result = a + b;
            operationSymbol = '+';
            operationName = '덧셈';
            break;
        case 'subtract':
            result = a - b;
            operationSymbol = '-';
            operationName = '뺄셈';
            break;
        case 'multiply':
            result = a * b;
            operationSymbol = '×';
            operationName = '곱셈';
            break;
        case 'divide':
            if (b === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '❌ 오류: 0으로 나눌 수 없습니다!'
                        }
                    ]
                };
            }
            result = a / b;
            operationSymbol = '÷';
            operationName = '나눗셈';
            break;
        default:
            throw new Error('지원하지 않는 연산입니다.');
    }
    
    // 결과를 깔끔하게 포맷팅
    const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(2);
    
    const output = `🧮 **계산 결과**
    
**연산**: ${operationName} (${operationSymbol})
**계산식**: ${a} ${operationSymbol} ${b} = ${formattedResult}
**결과**: **${formattedResult}**`;

    return {
        content: [
            {
                type: 'text',
                text: output
            }
        ]
    };
});


// 한국 시간 Tool 추가
server.tool('korea-time', '한국의 현재 시간을 조회하는 도구입니다.', {
    format: z.enum(['full', 'simple', 'date-only', 'time-only']).optional().describe('시간 출력 형식 (기본: full)')
}, async (args) => {
    const { format = 'full' } = args;
    
    // 한국 시간대(KST, UTC+9) 설정
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    
    // 요일 배열
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekdayShort = ['일', '월', '화', '수', '목', '금', '토'];
    
    // 날짜 및 시간 정보 추출
    const year = koreaTime.getUTCFullYear();
    const month = koreaTime.getUTCMonth() + 1;
    const date = koreaTime.getUTCDate();
    const hours = koreaTime.getUTCHours();
    const minutes = koreaTime.getUTCMinutes();
    const seconds = koreaTime.getUTCSeconds();
    const weekday = weekdays[koreaTime.getUTCDay()];
    const weekdayS = weekdayShort[koreaTime.getUTCDay()];
    
    // 12시간 형식을 위한 AM/PM 처리
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? '오후' : '오전';
    
    // 0 패딩 함수
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    let timeString = '';
    let emoji = '';
    
    // 시간대별 이모지
    if (hours >= 6 && hours < 12) {
        emoji = '🌅'; // 아침
    } else if (hours >= 12 && hours < 18) {
        emoji = '☀️'; // 낮
    } else if (hours >= 18 && hours < 22) {
        emoji = '🌆'; // 저녁
    } else {
        emoji = '🌙'; // 밤
    }
    
    switch (format) {
        case 'simple':
            timeString = `${month}/${date} ${pad(hours)}:${pad(minutes)}`;
            break;
        case 'date-only':
            timeString = `${year}년 ${month}월 ${date}일 ${weekday}`;
            break;
        case 'time-only':
            timeString = `${ampm} ${hour12}:${pad(minutes)}:${pad(seconds)}`;
            break;
        case 'full':
        default:
            timeString = `${year}년 ${month}월 ${date}일 ${weekday} ${ampm} ${hour12}:${pad(minutes)}:${pad(seconds)}`;
            break;
    }
    
    const output = timeString;

    return {
        content: [
            {
                type: 'text',
                text: output
            }
        ]
    };
});

// 이미지 생성 Tool 추가
server.tool('generate-image', '텍스트 프롬프트를 기반으로 이미지를 생성하는 도구입니다.', {
    prompt: z.string().describe('이미지 생성을 위한 텍스트 프롬프트')
}, async (args) => {
    const { prompt } = args;
    
    try {
        // HF_TOKEN 환경변수 확인
        const hfToken = process.env.HF_TOKEN;
        if (!hfToken) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ 오류: HF_TOKEN 환경변수가 설정되지 않았습니다. Hugging Face API 토큰이 필요합니다.'
                    }
                ]
            };
        }

        // Hugging Face Inference Client 생성
        const client = new InferenceClient(hfToken);
        
        // 이미지 생성
        const image = await client.textToImage({
            provider: "fal-ai",
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: prompt,
            parameters: { num_inference_steps: 5 },
        });

        // Blob을 ArrayBuffer로 변환
        const arrayBuffer = await (image as unknown as Blob).arrayBuffer();
        
        // ArrayBuffer를 Base64로 변환
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = Buffer.from(uint8Array).toString('base64');

        return {
            content: [
                {
                    type: 'image',
                    data: base64String,
                    mimeType: 'image/png'
                }
            ],
            annotations: {
                audience: ['user'],
                priority: 0.9
            }
        };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ 이미지 생성 중 오류가 발생했습니다: ${errorMessage}`
                }
            ]
        };
    }
});

// 코드 리뷰 프롬프트 추가
server.prompt('code-review', '사용자가 입력한 코드를 체계적으로 리뷰하기 위한 프롬프트입니다.', {
    code: z.string().describe('리뷰할 코드')
}, async (args) => {
    const { code } = args;
    
    // 간단한 언어 감지
    const detectLanguage = (code: string): string => {
        if (/import\s+.*from|export\s+.*|const\s+.*=|let\s+.*=|function\s+.*\(/.test(code)) {
            if (/interface\s+|type\s+.*=|as\s+/.test(code)) return 'TypeScript';
            return 'JavaScript';
        }
        if (/def\s+.*:|import\s+.*:|class\s+.*:|if\s+__name__/.test(code)) return 'Python';
        if (/function\s+.*\(.*\)\s*{|<?php/.test(code)) return 'PHP';
        if (/public\s+class|import\s+java|System\.out\.println/.test(code)) return 'Java';
        if (/#include|int\s+main|cout\s*<</.test(code)) return 'C++';
        if (/fn\s+.*\(|use\s+std::|let\s+mut/.test(code)) return 'Rust';
        if (/func\s+.*\(|package\s+main|fmt\.Print/.test(code)) return 'Go';
        return '알 수 없음';
    };
    
    const detectedLang = detectLanguage(code);
    
    const systemPrompt = `당신은 경험이 풍부한 시니어 개발자입니다. 주어진 코드를 종합적으로 분석하고 리뷰해주세요.

**분석 대상 코드:**
언어: ${detectedLang}

\`\`\`${detectedLang.toLowerCase()}
${code}
\`\`\`

**종합 체크포인트:**
- 코드 가독성 및 명확성
- 로직 정확성 및 버그 가능성
- 에러 핸들링 및 예외 처리
- 성능 및 효율성
- 보안 이슈
- 코딩 스타일 및 베스트 프랙티스
- 테스트 커버리지
- 문서화 품질

다음 형식으로 체계적이고 건설적인 피드백을 제공해주세요:

### ✅ 좋은 점 (Strengths)
- [잘 작성된 부분들을 구체적으로 명시]

### ⚠️ 개선 사항 (Areas for Improvement)  
- [문제점과 개선 방안을 구체적으로 제시]

### 🚨 중요 이슈 (Critical Issues)
- [보안, 성능, 버그 등 심각한 문제가 있다면 우선순위별로 명시]

### 💡 제안사항 (Suggestions)
- [더 나은 구현 방법이나 대안 제시]

### 📊 종합 평가 (Overall Assessment)
- **점수**: /10
- **핵심 개선 포인트**: [1-3개 요약]  
- **추천 액션**: [즉시 수정해야 할 사항들]

전문적이면서도 친근한 톤으로 설명해주세요.`;

    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: systemPrompt
                }
            }
        ]
    };
});

// MCP Resource 추가 - 서버 스펙 문서
server.resource('server-spec', 'server-spec://info', {
    name: '서버 스펙',
    description: '서버 사양 및 도구 목록을 제공하는 마크다운 문서입니다.',
    mimeType: 'text/markdown'
}, async () => {
    const serverSpec = `# 🚀 Greeting MCP Server

## 📋 서버 정보
- **이름**: Greeting MCP Server
- **버전**: 1.0.0
- **언어**: TypeScript
- **프로토콜**: Model Context Protocol (MCP)

## 🛠️ 제공 도구 (Tools)

### 1. 🤝 인사하기 (\`greeting\`)
> 사용자에게 다국어로 인사를 전하는 도구

**매개변수:**
- \`name\` (필수): 인사할 대상의 이름
- \`language\` (선택): 언어 선택 (\`korean\`, \`english\`, \`japanese\`)

**예시:**
\`\`\`
greeting(name: "홍길동", language: "korean")
→ "안녕하세요, 홍길동님! 만나서 반갑습니다!"
\`\`\`

### 2. 🧮 계산기 (\`calculator\`)
> 사칙연산을 수행하는 계산 도구

**매개변수:**
- \`operation\` (필수): 연산 유형 (\`add\`, \`subtract\`, \`multiply\`, \`divide\`)
- \`a\` (필수): 첫 번째 숫자
- \`b\` (필수): 두 번째 숫자

**예시:**
\`\`\`
calculator(operation: "multiply", a: 39800, b: 10)
→ 🧮 계산 결과: 398000
\`\`\`

### 3. ⏰ 한국 시간 (\`korea-time\`)
> 한국 표준시(KST) 현재 시간 조회

**매개변수:**
- \`format\` (선택): 출력 형식
  - \`full\`: 완전한 날짜와 시간 (기본)
  - \`simple\`: 간단한 형식
  - \`date-only\`: 날짜만
  - \`time-only\`: 시간만

**예시:**
\`\`\`
korea-time(format: "time-only")
→ "오후 2:03:40"
\`\`\`

### 4. 🎨 이미지 생성 (\`generate-image\`)
> 텍스트 프롬프트를 기반으로 AI 이미지를 생성하는 도구

**매개변수:**
- \`prompt\` (필수): 이미지 생성을 위한 텍스트 프롬프트

**특징:**
- **모델**: FLUX.1-schnell (black-forest-labs)
- **출력**: Base64 인코딩된 PNG 이미지
- **품질**: 고품질 AI 생성 이미지
- **속도**: 빠른 추론 (5 스텝)

**예시:**
\`\`\`
generate-image(prompt: "Astronaut riding a horse")
→ [Base64 인코딩된 이미지 데이터 반환]
\`\`\`

**필수 설정:**
- \`HF_TOKEN\` 환경변수에 Hugging Face API 토큰 설정 필요

## 🏗️ 기술 스택
- **언어**: TypeScript
- **런타임**: Node.js
- **프레임워크**: MCP SDK
- **스키마 검증**: Zod
- **AI 이미지 생성**: Hugging Face Inference
- **빌드 도구**: TypeScript Compiler

## 📦 설치 및 실행
\`\`\`bash
# 의존성 설치
npm install

# 빌드
npm run build

# 실행
./build/index.js
\`\`\`

## 📝 제공 프롬프트 (Prompts)

### 1. 📋 코드 리뷰 (\`code-review\`)
> 사용자 코드를 체계적으로 리뷰하기 위한 전문 프롬프트

**매개변수:**
- \`code\` (필수): 리뷰할 코드

**지원 언어:**
- TypeScript, JavaScript, Python, Java, C++, Rust, Go, PHP (자동 감지)

**예시:**
\`\`\`
code-review(code: "function add(a, b) { return a + b; }")
→ 경험 많은 시니어 개발자 관점의 종합적 코드 리뷰
\`\`\`

## 🌟 특징
- ✅ **다국어 인사**: 한국어, 영어, 일본어 인사 지원
- ✅ **실시간 시간**: 정확한 한국 표준시
- ✅ **정확한 계산**: 사칙연산 및 오류 처리
- ✅ **AI 이미지 생성**: FLUX.1-schnell 모델 기반 고품질 이미지 생성
- ✅ **전문 코드 리뷰**: AI를 활용한 체계적인 코드 분석
- ✅ **깔끔한 출력**: 사용자 친화적 인터페이스

---
*Made with ❤️ using TypeScript & MCP*`;

    return {
        contents: [
            {
                uri: 'server-spec://info',
                mimeType: 'text/markdown',
                text: serverSpec
            }
        ]
    };
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Greeting MCP Server running on stdio');
}

main().catch(console.error);
