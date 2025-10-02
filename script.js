import * as Tone from "tone";


//choppy init
// let input_grain_size = 0.08;
// let input_density = 6;
// let input_jitter = 8;

//NOTES: 
//grain_size ranges 0.08 - 2s
//input_density ranges 10 - 1 per ___
//input_jitt range 0 - 8

//init audio variables
var input_file = "audio/gym_sample.mp3";
let audioContextStarted = false;
let input_grain_size = 0.08;
let input_density = 10;
let input_jitter = 0;

let max_grain_size = 2;
let max_density = 10;
let max_jitter = 8;

let current_grain_size = 2;
let current_density = 2;
let current_jitter = 0;
let current_player = null;
let current_gain = null;

//init gui variables 
let isRotating = false;
let currentKnob = null;
let currentPointer = null;
let currentText = null;
let currentProgressPercent = 0; // Global variable to store progress

//waveform generator
let waveform = null;

function startAudio() {
    if (!audioContextStarted) {
        Tone.start(); // This resumes the audio context
        audioContextStarted = true;
    }
    // Your audio code here
    console.log("Audio context started");
    // Call createAudioGrain to test it
    createAudioGrain(input_file, "output.mp3", input_grain_size, input_density, input_jitter);
}

    //input_file - location
    //output_fules - string
    //grain size (seconds)
    //density (seconds)
    //jitter ()
 function createAudioGrain(input_file, output_file, grain_size, density, jitter){
    const buffer = new Tone.ToneAudioBuffer(input_file, () => {
        console.log("Audio File Loaded", input_file);

        //check if player is already playing
        if (current_player && current_gain){
            current_gain.gain.rampTo(0,0.3);

            setTimeout(() => {
                current_player.stop();
                current_player.dispose();
                current_gain.dispose();
                current_player = null;
                current_gain = null;
                console.log('audio stopped');
            }, 200); // slightly > fade time
        }
        

        // Access the array data AFTER the file is loaded
        var sampleRate = buffer.sampleRate;
        var audioArray = buffer.toArray();

        // console.log("Sample rate:", sampleRate);
        // console.log("Audio array length:", audioArray.length);
        // console.log("Audio array:", audioArray);

        //convert sound to mono if audioArray has 2 channels
        if (audioArray.length == 0){
            console.error("toArray error: Audio file is empty");
        }
        else if (audioArray.length > 1){
            // console.log("Processing stereo audio...");
            const leftChannelArray = audioArray[0];
            const rightChannelArray = audioArray[1];
            audioArray = leftChannelArray.map((left,i) => (left + rightChannelArray[i])/2);
            // console.log("Converted to Mono: ", audioArray);
        }
        else {
            // console.log("Imported as Mono: ",audioArray);
        }
        //calculate samples per grain
        var samples_per_grain = Math.floor(grain_size * sampleRate);
        var grain_spacing = Math.max(sampleRate/density,1); //no fractional samples between grains
        // console.log("samples per grain:", samples_per_grain);
        // console.log("grain_spacing:",grain_spacing);

        // init output buffer as zeros, same length as current mono data
        var output = new Float32Array(audioArray.length);
        // console.log("Initialized zero output of length:", output.length);
        
        //options to add hamming window
        //windowFunction[i] = 0.54 - 0.46 * cos(2*PI*i/samplesPerGrain);
        var window = new Float32Array(samples_per_grain);
        for (let j = 0; j < samples_per_grain; j++){
            window[j] = 0.54 - 0.46 * Math.cos(2*Math.PI*j / samples_per_grain);
        }
        // console.log("window length:", window.length);

        
        //grains total
        const grains_total = Math.floor((audioArray.length - samples_per_grain) / grain_spacing)
        // console.log("grains_total",grains_total)

        //init grain start
        var position = 0;

        for (let i = 0; i < grains_total; i++){
            var random_offset = (Math.random() - 0.5) * 2*jitter * grain_spacing; 

            //jittered grain start position
            let grain_start = position + random_offset;

            //clipping if grain start is before
            if (grain_start < 0) {
                grain_start = 0;
            }
            else if (grain_start > audioArray.length - samples_per_grain){
                grain_start = audioArray.length - samples_per_grain;
            }

            //extract grain from input
            let grain = audioArray.slice(grain_start, grain_start + samples_per_grain);

            //apply hamming window (if possible)
            for (let k = 0; k < grain.length; k++) {
                grain[k] = grain[k] * window[k];
            }

            let output_position = position;

            //mix the grain into the output
            for (let sampleIndex = 0; sampleIndex < grain.length; sampleIndex++){
                output[output_position + sampleIndex] += grain[sampleIndex];
            }

            //advance to next grain position
            position += grain_spacing;
        } 

        // console.log("Output array:", output);
        
        //find peak value
        let peak = output[0];
        for (let ii = 1; ii < output.length; ii++){
            if (output[ii] > peak){
                peak = output[ii];
            }
        }


        // console.log("Peak value:", peak);

        //normalize
        if (peak > 0) {
            output = output.map(sample => (sample / peak) * 0.8);
        } 

        // console.log("Output length:", output.length);
        // console.log("Sample rate:", sampleRate);
        // console.log("Duration (seconds):", output.length / sampleRate);
        // console.log("First 10 samples:", output.slice(0, 10));
        // console.log("Last 10 samples:", output.slice(-10));
        // console.log("Has NaN:", output.some(isNaN));

        const newBuffer = Tone.Buffer.fromArray(output, sampleRate);
        current_gain = new Tone.Gain(0.8).toDestination();
        current_player = new Tone.Player(newBuffer).connect(current_gain).toDestination();
        // current_player.loop = true;
        // waveform = Tone.Waveform;
        // console.log('waveform data',waveform);
        current_player.loop = true;
        current_player.start();
        console.log('audio playing');

    });
}



//slider function
function sliderRotate(){
    document.addEventListener("mousedown", (e) => {
        // console.log(e.target.closest('.knob'));
        if(e.target.closest(".knob")){
            isRotating = true;
            currentKnob = e.target.closest(".knob");
            console.log(currentKnob.querySelector(".pointer"));
            //get child element with id or class of POINTER
            currentPointer = currentKnob.querySelector(".pointer");
             //get child element with id or class of TEXT
            currentText = currentKnob.querySelector(".text")
        }
    });
}

const rotateKnob = (e) =>{
    if(isRotating){
        //get knob that was clicked

        let knobX = currentKnob.getBoundingClientRect().left + currentKnob.clientWidth/2;
        let knobY = currentKnob.getBoundingClientRect().top + currentKnob.clientHeight/2;
        let deltaX = e.clientX - knobX;
        let deltaY = e.clientY - knobY;
        let angleRad = Math.atan2(deltaY,deltaX);
        let angleDeg = (angleRad*180)/Math.PI;
        let rotationAngle = (angleDeg - 135 + 360)%360;

        if(rotationAngle <= 270) {
            currentPointer.style.transform = `rotate(${angleDeg - 135 - 45}deg)`;
            console.log(`rotate(${angleDeg - 135 - 45}deg)`);
            let progressPercent = rotationAngle/270;
            currentText.innerHTML = `${Math.round(progressPercent*100)}`;
            currentProgressPercent = progressPercent; // Store in global variable

            //if knob 1, then update grain size, etc
            //element.className.includes('left') ---> 
            if (currentKnob.id.includes('1')) {
                current_grain_size = input_grain_size + currentProgressPercent * (max_grain_size - input_grain_size);
            }
            else if (currentKnob.id.includes('2')) {
                current_density = input_density - currentProgressPercent * (max_density - input_density);
            }
            else if (currentKnob.id.includes('3')) {
                current_jitter = input_jitter + currentProgressPercent * (max_jitter - input_jitter);
            }
           



        }
        console.log('Current Grain Size', current_grain_size);
        console.log('Current grain Density', current_grain_size);
        console.log('Current grain Jitter', current_jitter);
    }
    
}


//main call function
function main(){
    //set grain size to max value for init
    document.getElementById("text_1").innerHTML = 100;
    document.getElementById("pointer_1").style.transform = 'rotate(-135deg)';
    document.getElementById("text_2").innerHTML = 100;
    document.getElementById("pointer_2").style.transform = 'rotate(-135deg)';


    //call 
    document.addEventListener('click', startAudio, { once: true });
    sliderRotate();
    document.addEventListener("mousemove", rotateKnob);
    document.addEventListener("mouseup",() => {
        isRotating = false;
        createAudioGrain(input_file, "output.mp3", current_grain_size, current_density, current_jitter);
    });
}

//call main()
document.addEventListener('DOMContentLoaded',main)






//TESTING TONE JS BELOW
/*
const synth = new Tone.Synth().toDestination();




document.addEventListener('click', async function() {
    // Your code here will run after the HTML is fully loaded
    await Tone.start();
    console.log("audio is ready");

    const feedbackDelay = new Tone.FeedbackDelay("1n", 0.5).toDestination();
    
    const player = new Tone.Player({
        url: "audio/gym_sample.mp3",
        loop: true
        //delay: .1
    }
    ).connect(feedbackDelay);

    Tone.loaded().then(() => {
        player.start();
    });
});
*/

