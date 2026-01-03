import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Mic, MicOff, Image, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        
        // Convert to base64 for transcription
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendMessage(input, undefined, base64Audio);
          setIsProcessingAudio(false);
        };
        reader.readAsDataURL(audioBlob);
        
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

  const sendMessage = async (text?: string, imageBase64?: string, audioBase64?: string) => {
    const messageText = text || input;
    if (!messageText.trim() && !imageBase64 && !audioBase64) return;
    if (loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: messageText || (imageBase64 ? '[Image uploaded]' : '[Voice message]'),
      imageUrl: imageBase64
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
          imageBase64: imageBase64 || imagePreview,
          audioTranscript: audioBase64 ? messageText : undefined
        }
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data?.content || t('error')
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || t('error'));
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
          <h1 className="font-display text-2xl font-bold text-foreground">{t('aiAssistant')}</h1>
          <p className="text-sm text-muted-foreground">{t('askAnything')}</p>
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
              disabled={loading || isProcessingAudio}
              title={isRecording ? t('stopRecording') : t('recordAudio')}
            >
              {isProcessingAudio ? (
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
              placeholder={t('typeMessage')}
              disabled={loading || isRecording}
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
