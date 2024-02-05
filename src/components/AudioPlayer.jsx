import { useEffect, useRef } from "react";

import PropTypes from 'prop-types';

AudioPlayer.propTypes = {
    audioUrl: PropTypes.string.isRequired,
    mimeType: PropTypes.string.isRequired,
};

export default function AudioPlayer({ audioUrl, mimeType }) {
    const audioPlayer = useRef(null);
    const audioSource = useRef(null);

    // Updates src when url changes
    useEffect(() => {
        if (audioPlayer.current && audioSource.current) {
            audioSource.current.src = audioUrl;
            audioPlayer.current.load();
        }
    }, [audioUrl]);

    return (
        <div className='flex relative z-10 my-4 w-full dark:bg-white text-gray-100'>
            <audio
                ref={audioPlayer}
                controls
                className='w-full h-14 rounded-lg dark:bg-white shadow-xl shadow-black/5 ring-1 ring-slate-700/10'
            >
                <source ref={audioSource} type={mimeType}></source>
            </audio>
        </div>
    );
}
