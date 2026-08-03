import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  Settings, Loader2, Download 
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (percentage: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, title, onProgress }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);

  // Toggle Play/Pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) { videoRef.current.pause(); } 
      else { videoRef.current.play(); }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (isMuted) { setVolume(1); videoRef.current.volume = 1; } 
      else { setVolume(0); videoRef.current.volume = 0; }
    }
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  // Format Time
  const formatTime = (timeInSeconds: number) => {
    const result = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
    return result.startsWith('00:') ? result.substr(3) : result;
  };

  // Handle Time Update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      if (time > maxWatchedTime) { setMaxWatchedTime(time); }
    }
  };

  // Handle Progress Scrubbing
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) { videoRef.current.currentTime = newTime; }
  };

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else { document.exitFullscreen(); }
  };

  // Video Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const setVideoData = () => setDuration(video.duration);
    const setPlay = () => setIsPlaying(true);
    const setPause = () => setIsPlaying(false);
    const waiting = () => setIsWaiting(true);
    const playing = () => setIsWaiting(false);
    video.addEventListener('loadeddata', setVideoData);
    video.addEventListener('play', setPlay);
    video.addEventListener('pause', setPause);
    video.addEventListener('waiting', waiting);
    video.addEventListener('playing', playing);
    return () => {
      video.removeEventListener('loadeddata', setVideoData);
      video.removeEventListener('play', setPlay);
      video.removeEventListener('pause', setPause);
      video.removeEventListener('waiting', waiting);
      video.removeEventListener('playing', playing);
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) { videoRef.current.load(); }
  }, [src]);

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality);
    setShowSettings(false);
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (onProgress) { onProgress(progressPercentage); }
  }, [progressPercentage, onProgress]);

  return (
    <div 
      ref={playerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden font-sans group/vplayer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setShowSettings(false); }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="auto"
        className="w-full h-full object-contain cursor-pointer"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        playsInline
      />

      {/* Buffering Indicator */}
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-10 pointer-events-none">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Top Title Overlay */}
      {title && (
        <div className={`absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-500 z-20 pointer-events-none ${isHovering || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-white text-lg font-black tracking-tight drop-shadow-2xl">{title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Institutional Stream</span>
              </div>
            </div>
            <a 
              href={src} 
              download
              className="p-3 glass hover:bg-white/10 text-white rounded-xl backdrop-blur-xl transition-all border border-white/10 pointer-events-auto active:scale-95 shadow-2xl"
              title="Download Asset"
            >
              <Download size={18} />
            </a>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isWaiting && (
        <button 
          onClick={togglePlay}
          className="absolute z-20 flex items-center justify-center w-24 h-24 glass-btn-primary text-white rounded-full shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all hover:scale-110 active:scale-90"
        >
          <Play fill="currentColor" size={36} className="ml-2" />
        </button>
      )}

      {/* Bottom Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 px-8 pb-8 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all duration-500 z-20 ${isHovering || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* Progress Bar Container */}
        <div className="group/progress relative flex items-center w-full h-4 mb-6 cursor-pointer">
          {/* Background Track */}
          <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden transition-all group-hover/progress:h-2">
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500 progress-glow rounded-full" 
              style={{ width: `${progressPercentage}%`, color: '#818cf8' }}
            />
          </div>
          {/* Seek Input */}
          <input 
            type="range" min="0" max={duration || 100} value={currentTime} 
            onChange={handleProgressChange}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          {/* Thumb Indicator (visible on hover) */}
          <div 
             className="absolute w-4 h-4 bg-white rounded-full shadow-2xl scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none border-2 border-indigo-500"
             style={{ left: `calc(${progressPercentage}% - 8px)` }}
          ></div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="hover:text-indigo-400 transition-all active:scale-90">
              {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
            </button>
            
            <div className="flex items-center gap-4 group/volume">
              <button onClick={toggleMute} className="hover:text-indigo-400 transition-all">
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-500 ease-out">
                <input 
                  type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-indigo-500 bg-white/10 h-1 rounded-full ml-2"
                />
              </div>
            </div>

            <div className="text-[11px] font-black tracking-[0.1em] text-white/80 tabular-nums">
              {formatTime(currentTime)} <span className="text-white/30 mx-2">|</span> {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="hover:text-indigo-400 transition-all flex items-center gap-2 group/set"
              >
                <span className="text-[9px] font-black glass px-2 py-0.5 rounded-lg border-white/10 text-white/80 group-hover/set:border-indigo-500/30 transition-all uppercase tracking-widest">{quality}</span>
                <Settings size={20} className="group-hover/set:rotate-45 transition-transform duration-500" />
              </button>

              {/* Quality Settings Menu */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-6 w-36 glass glass-edge rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="px-4 py-3 border-b border-white/[0.04] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Stream Quality</div>
                  <div className="p-1">
                    {['1080p', '720p', '480p', 'Auto'].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${quality === q ? 'badge-indigo' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition-all active:scale-90">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
