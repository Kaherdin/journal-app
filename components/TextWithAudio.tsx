'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface TextWithAudioProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  rows?: number;
  isTextarea?: boolean;
  id?: string;
}

export const TextWithAudio = ({
  value,
  onChange,
  placeholder = '',
  label,
  className = '',
  rows = 4,
  isTextarea = true,
  id,
}: TextWithAudioProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingVolume, setRecordingVolume] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Check if audio recording is supported
  useEffect(() => {
    const checkAudioSupport = async () => {
      try {
        if (typeof navigator === 'undefined' || 
            !navigator.mediaDevices?.getUserMedia) {
          setIsAudioSupported(false);
          return;
        }
        
        // Try to access the microphone to check permissions
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // Release the stream immediately
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(() => {
            setIsAudioSupported(false);
          });
      } catch (err) {
        setIsAudioSupported(false);
      }
    };
    
    checkAudioSupport();
  }, []);
  
  // Fonction pour arrêter tous les processus liés à l'enregistrement
  const cleanupRecording = () => {
    // Arrêter le timer d'enregistrement
    if (recorderTimerRef.current) {
      clearInterval(recorderTimerRef.current);
      recorderTimerRef.current = null;
    }
    
    // Arrêter l'analyseur audio
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    setRecordingTime(0);
    setRecordingVolume(0);
    
    // Arrêter et nettoyer le MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
      
      // Libérer le microphone
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      chunksRef.current = [];
      
      // Nettoyer tout enregistrement précédent
      cleanupRecording();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Configurer l'analyseur audio pour les niveaux de volume
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      audioAnalyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Configurer le timer pour mesurer le volume et mettre à jour le temps
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      recorderTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculer la moyenne du volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setRecordingVolume(average);
        
        // Incrémenter le temps d'enregistrement (en secondes)
        setRecordingTime(prev => prev + 0.1);
      }, 100);
      
      // Set audio constraints for better quality
      const options = {
        mimeType: 'audio/webm',
      };
      
      // Try the preferred mime type, fall back to browser default if not supported
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Preferred mime type not supported, using browser default');
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Add a small delay before processing to ensure all data is collected
        setTimeout(() => {
          const audioBlob = new Blob(chunksRef.current, { 
            type: 'audio/webm' 
          });
          processAudioToText(audioBlob);
        }, 500);
      };
      
      // Request data more frequently (every 200ms)
      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to access microphone. Please check permissions.');
      setIsAudioSupported(false);
      cleanupRecording();
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Mark as not recording immediately to update UI
      setIsRecording(false);
      
      // Add a small delay before stopping to ensure we capture the full phrase
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          
          // Stop all tracks to release the microphone
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
          
          // Clean up recording resources
          cleanupRecording();
        }
      }, 800); // Increased delay for better capture
    }
  };
  
  const processAudioToText = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setError('');
      
      // Create FormData with the audio blob
      const formData = new FormData();
      // Explicitly set the filename with .webm extension to ensure proper MIME type detection
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to our transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the text with transcribed content
      // Append to existing content if there is any
      if (value && value.trim() !== '') {
        onChange(`${value} ${data.text}`);
      } else {
        onChange(data.text);
      }
    } catch (err) {
      console.error('Error during transcription:', err);
      setError(err instanceof Error ? err.message : 'Unable to transcribe audio. Please enter your text manually.');
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Nettoyer les ressources lors du démontage du composant
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);
  
  const TextComponent = isTextarea ? Textarea : Input;
  
  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="text-sm font-medium block mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <TextComponent
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={isTextarea ? rows : undefined}
          className={`${className} ${isTextarea ? 'resize-none' : ''} pr-12`}
          disabled={isTranscribing}
        />
        
        {isAudioSupported && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {isRecording && (
              <div 
                className="mr-2 h-2 w-2 rounded-full bg-red-500 animate-pulse"
                style={{
                  transform: `scale(${1 + (recordingVolume / 255) * 1.5})`,
                  opacity: 0.7 + (recordingVolume / 255) * 0.3
                }}
              />
            )}
            {isRecording && (
              <div className="mr-2 text-xs text-gray-500">
                {recordingTime.toFixed(1)}s
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full ${isRecording ? 'bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-600' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {isRecording && (
        <div className="absolute top-0 left-0 w-full h-full border-2 border-red-500 rounded-md pointer-events-none" />
      )}
    </div>
  );
};
