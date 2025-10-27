import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { history, userText } = body;

    // Mock response for ad-lib functionality
    // In a real implementation, this would call an AI service to generate contextually appropriate responses
    const mockLines = [
      {
        role: 'ai',
        text: '그렇군요. 계속해보세요.',
        audioUrl: undefined
      },
      {
        role: 'ai', 
        text: '흥미로운 관점이네요.',
        audioUrl: undefined
      },
      {
        role: 'ai',
        text: '그런 생각도 있군요.',
        audioUrl: undefined
      }
    ];

    // Simple logic to pick a response based on user input
    let selectedLine = mockLines[0];
    
    if (userText.includes('그렇다') || userText.includes('맞다')) {
      selectedLine = mockLines[0];
    } else if (userText.includes('생각') || userText.includes('느낌')) {
      selectedLine = mockLines[1];
    } else {
      selectedLine = mockLines[2];
    }

    return NextResponse.json({
      lines: [selectedLine],
      success: true
    });

  } catch (error) {
    console.error('Error in next-lines API:', error);
    return NextResponse.json(
      { error: 'Failed to generate next lines' },
      { status: 500 }
    );
  }
}
