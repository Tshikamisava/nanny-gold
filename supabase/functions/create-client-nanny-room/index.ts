import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, nanny_id } = await req.json();

    if (!client_id || !nanny_id) {
      return new Response(
        JSON.stringify({ error: 'Client ID and Nanny ID are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if room already exists between this client and nanny
    const { data: existingRoom, error: existingRoomError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        chat_room_participants!inner(user_id)
      `)
      .eq('type', 'client_nanny')
      .in('chat_room_participants.user_id', [client_id, nanny_id]);

    if (existingRoomError) {
      console.error('Error checking existing room:', existingRoomError);
    }

    let roomId: string;

    // Check if we have a room with both participants
    const roomWithBothParticipants = existingRoom?.find(room => {
      const participantIds = room.chat_room_participants.map((p: any) => p.user_id);
      return participantIds.includes(client_id) && participantIds.includes(nanny_id);
    });

    if (roomWithBothParticipants) {
      // Room already exists
      roomId = roomWithBothParticipants.id;
      console.log('Using existing client-nanny room:', roomId);
    } else {
      // Create new room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'client_nanny',
          created_by: client_id
        })
        .select('id')
        .single();

      if (roomError) {
        console.error('Error creating room:', roomError);
        return new Response(
          JSON.stringify({ error: 'Failed to create chat room' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      roomId = newRoom.id;

      // Add both participants
      const { error: participantsError } = await supabase
        .from('chat_room_participants')
        .insert([
          { room_id: roomId, user_id: client_id },
          { room_id: roomId, user_id: nanny_id }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        return new Response(
          JSON.stringify({ error: 'Failed to add participants to chat room' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Created new client-nanny room:', roomId);
    }

    return new Response(
      JSON.stringify({ room_id: roomId }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-client-nanny-room function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});