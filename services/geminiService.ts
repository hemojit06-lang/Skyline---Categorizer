
import { GoogleGenAI, Type } from "@google/genai";
import { ParseResponse } from "../types";

export const parseRawData = async (text: string): Promise<ParseResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these financial transactions. For each entry:
    1. 'item': Normalized name of the item or action.
    2. 'value': Numeric amount.
    3. 'type': 'credit' (money in/received) or 'debit' (money out/spent).
    4. 'involvedPerson': If the text mentions a person (e.g., 'Lent 50 to Dave', 'Bob owes me 20'), extract their name.
    5. 'isOwed': Set to true ONLY if the transaction implies the money should be returned (loans, 'lent', 'owes me').
    6. 'originalText': The original raw line.

    Data:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                value: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['credit', 'debit'] },
                involvedPerson: { type: Type.STRING, nullable: true },
                isOwed: { type: Type.BOOLEAN },
                originalText: { type: Type.STRING }
              },
              required: ["item", "value", "type", "isOwed", "originalText"]
            }
          }
        },
        required: ["transactions"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text.trim());
    return data as ParseResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Invalid data format returned from AI.");
  }
};
