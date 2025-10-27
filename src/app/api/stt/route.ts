import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const lang = (formData.get('lang') as string) || 'ko';

    if (!file) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    // Whisper REST API 호출
    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: (() => {
        const fd = new FormData();
        fd.append('file', file as any);
        fd.append('model', 'whisper-1'); // 필요 시 gpt-4o-mini-transcribe로 교체 가능
        fd.append('response_format', 'json');
        fd.append('temperature', '0');
        fd.append('language', lang);
        return fd;
      })(),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI transcription failed', detail: errText }, { status: 502 });
    }

    const data = await openaiRes.json();
    return NextResponse.json({ text: data.text ?? '' });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', detail: e?.message || String(e) }, { status: 500 });
  }
}