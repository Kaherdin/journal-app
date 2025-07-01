import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

// Endpoint pour supprimer une entrée de journal
export async function DELETE(request: NextRequest) {
  try {
    // Récupérer l'ID de l'entrée à supprimer depuis les params de l'URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'entrée requis' },
        { status: 400 }
      );
    }

    console.log(id, "id mf")

    // // Vérifier si l'ID est un UUID valide
    // if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    //   return NextResponse.json(
    //     { error: 'ID doit être un UUID valide' },
    //     { status: 400 }
    //   );
    // }

    console.log(`Suppression de l'entrée avec ID: ${id}`);

    // Supprimer l'entrée dans Supabase
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression:', error);
      return NextResponse.json(
        { error: `Erreur lors de la suppression: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Entrée supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entrée', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
