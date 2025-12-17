declare module '@rork-ai/toolkit-sdk' {
  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image'; image: string };
  type UserMessage = { role: 'user'; content: string | (TextPart | ImagePart)[] };
  type AssistantMessage = { role: 'assistant'; content: string | TextPart[] };

  interface GenerateTextParams {
    messages: (UserMessage | AssistantMessage)[];
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }

  export function generateText(params: string | GenerateTextParams): Promise<string>;
}
