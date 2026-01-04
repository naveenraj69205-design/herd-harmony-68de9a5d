import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Mic, MicOff, Image, X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  audioUrl?: string;
}

export default function AIChat() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Max 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
      
      const base64Audio = await base64Promise;
      
      const response = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio, language }
      });

      if (response.error) throw response.error;
      return response.data?.text || null;
    } catch (error: unknown) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const playTextToSpeech = async (text: string) => {
    if (!voiceEnabled || !text) return;
    
    try {
      setIsPlayingAudio(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice: 'alloy' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsPlayingAudio(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingAudio(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Transcribe the audio
        const transcribedText = await transcribeAudio(audioBlob);
        
        if (transcribedText) {
          await sendMessage(transcribedText);
        }
        
        setIsProcessingAudio(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (text?: string, imageBase64?: string) => {
    const messageText = text || input;
    if (!messageText.trim() && !imageBase64) return;
    if (loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: messageText || '[Image uploaded]',
      imageUrl: imageBase64 || imagePreview || undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setImagePreview(null);
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('chat', {
        body: { 
          messages: [...messages, { role: 'user', content: messageText }],
          language,
          imageBase64: imageBase64 || imagePreview
        }
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || t('error');
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Play voice response if enabled
      if (voiceEnabled && assistantContent) {
        playTextToSpeech(assistantContent);
      }
    } catch (error: unknown) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : t('error');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, imagePreview || undefined);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-73px)] lg:h-screen flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{t('aiAssistant')}</h1>
              <p className="text-sm text-muted-foreground">{t('askAnything')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="voice-mode"
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
              <Label htmlFor="voice-mode" className="text-sm flex items-center gap-2">
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {voiceEnabled ? t('voiceEnabled') : t('voiceDisabled')}
              </Label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-display text-lg font-semibold mb-2">{t('howCanIHelp')}</h3>
              <p className="text-muted-foreground text-sm">{t('askAboutBreeding')}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <Card className={`max-w-[80%] p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Uploaded" 
                    className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-cover"
                  />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && voiceEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-6 px-2"
                    onClick={() => isPlayingAudio ? stopAudio() : playTextToSpeech(msg.content)}
                  >
                    {isPlayingAudio ? (
                      <VolumeX className="h-3 w-3 mr-1" />
                    ) : (
                      <Volume2 className="h-3 w-3 mr-1" />
                    )}
                    {isPlayingAudio ? t('stopVoice') : t('playVoice')}
                  </Button>
                )}
              </Card>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <Card className="p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </Card>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-border">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => setImagePreview(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title={t('uploadImage')}
            >
              <Image className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || isProcessingAudio || isTranscribing}
              title={isRecording ? t('stopRecording') : t('recordAudio')}
            >
              {isProcessingAudio || isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTranscribing ? t('transcribing') : t('typeMessage')}
              disabled={loading || isRecording || isTranscribing}
              className="flex-1"
            />
            
            <Button type="submit" disabled={loading || (!input.trim() && !imagePreview)}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
