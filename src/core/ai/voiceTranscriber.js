export class SpeechTranscriber {
  constructor(provider) { this.provider=provider; }
  async transcribe(audio) { if(!this.provider?.transcribe) throw new Error('Transcription provider unavailable.'); return this.provider.transcribe(audio); }
}

export class WebSpeechTranscriber {
  constructor({ language='en-IN' }={}) { this.language=language; }
  async transcribe() {
    const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('Speech recognition is unavailable on this device.');
    return new Promise((resolve,reject)=>{
      const recognition=new SpeechRecognition();
      recognition.lang=this.language; recognition.interimResults=false; recognition.maxAlternatives=1;
      recognition.onresult=e=>resolve({text:e.results[0][0].transcript,confidence:e.results[0][0].confidence});
      recognition.onerror=e=>reject(new Error(e.error || 'Speech recognition failed.'));
      recognition.onend=()=>{};
      recognition.start();
    });
  }
}

export function createLocalTranscriber(options={}) { return new WebSpeechTranscriber(options); }
