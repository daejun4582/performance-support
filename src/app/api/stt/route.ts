import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 STT API called');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const lang = formData.get('lang') as string || 'ko';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('🎤 Processing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      lang
    });

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object for OpenAI API
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: lang === 'ko' ? 'ko' : undefined,
      response_format: 'text'
    });

    console.log('✅ Whisper transcription completed:', transcription);

    return NextResponse.json({ 
      text: transcription,
      language: lang 
    });

  } catch (error) {
    console.error('❌ STT API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
