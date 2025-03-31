import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialiser OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Récupérer le fichier audio de la requête
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Fichier audio requis' },
        { status: 400 }
      );
    }
    
    // Transcription via Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'fr',
      response_format: 'json',
    });
    
    return NextResponse.json({
      text: transcription.text
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la transcription:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la transcription', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
