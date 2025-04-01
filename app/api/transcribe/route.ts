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

    // Vérifier le type de fichier audio
    const buffer = await audioFile.arrayBuffer();
    const fileBlob = new Blob([buffer], { type: 'audio/webm' });
    
    // Convertir le Blob en fichier avec extension explicite
    const fileName = 'recording.webm';
    const fileObject = new File([fileBlob], fileName, { type: 'audio/webm' });
    
    // Log pour le débogage
    console.log(`Fichier préparé pour transcription: ${fileName}, type: ${fileObject.type}, taille: ${fileObject.size} bytes`);
    
    // Transcription via Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fileObject,
      model: 'whisper-1',
      response_format: 'json',
    });
    
    return NextResponse.json({
      text: transcription.text
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erreur lors de la transcription:', error);
    
    // Retourner un message d'erreur plus détaillé
    return NextResponse.json(
      { 
        error: 'Erreur lors de la transcription', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
