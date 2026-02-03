export interface AudioPreprocessorOptions {
  highPassCutoff?: number
  bufferDuration?: number
  useHighPassFilter?: boolean
}

export function resampleAudio(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return inputData
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.round(inputData.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1)
    const t = srcIndex - srcIndexFloor

    output[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t
  }

  return output
}

export class AudioPreprocessorService {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private options: AudioPreprocessorOptions

  constructor(options: AudioPreprocessorOptions = {}) {
    this.options = {
      highPassCutoff: options.highPassCutoff ?? 50,
      bufferDuration: options.bufferDuration ?? 0.5,
      useHighPassFilter: options.useHighPassFilter ?? true,
    }
  }

  async initialize(stream: MediaStream): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    this.sourceNode = this.audioContext.createMediaStreamSource(stream)

    if (this.options.useHighPassFilter && this.options.highPassCutoff) {
      const highPassFilter = this.audioContext.createBiquadFilter()
      highPassFilter.type = 'highpass'
      highPassFilter.frequency.value = this.options.highPassCutoff
      this.sourceNode.connect(highPassFilter)
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.sourceNode
  }

  getWorkletNode(): AudioWorkletNode | null {
    return this.workletNode
  }

  destroy(): void {
    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
