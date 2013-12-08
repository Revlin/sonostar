/*
 *      Copyright 2013  Samsung Electronics Co., Ltd
 *
 *      Licensed under the Flora License, Version 1.1 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *              http://floralicense.org/license/
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

/*global $: false, tizen: false, navigator: false, app: true*/

var app = {
	sensor: null,
	R: 2000.0, // // gravity constant * m * M

	gameWidth: 0,
	gameHeight: 0,
	ballWidth: 0,
	ballHeight: 0,
	sunWidth: 0,
	sunHeight: 0,
	ballX: 100,
	ballY: 100,
	dX: 0,
	dY: 0,
	sunX: 0,
	sunY: 0,

	backgroundWidth: 0,
	backgroundHeight: 0,
	backgroundTop: 0,
	backgroundLeft: 0,

	resistance: 0.98, // air
	friction: 0.90, // bounce
	sideFriction: 0.95,
	frictionC: 0.002,
	repulse: 0.6,
	cdd: -0.3,

	timeout: null,
	current: 'ball',
	event: null,
	animationInterval: 40,

	/**
	 * Draw earth background position
	 * @param {int} x current x earth position
	 * @param {int} y current y earth position
	 */
	earthUpdateBackgroundPosition: function earthUpdateBackgroundPosition(x, y) {
		"use strict";
		var rX, rY,
			cX, cY,
			tX, tY,
			bdX, bdY,
			br;

		rX = -30.0;
		rY = -30.0;

		cX = (this.gameWidth - this.backgroundWidth) / 2;
		cY = (this.gameHeight - this.backgroundHeight) / 2;

		tX = cX + (-x * rX);
		tY = cY + (y * rY);

		bdX = tX - this.backgroundLeft;
		bdY = tY - this.backgroundTop;

		br = 0.2;

		this.backgroundLeft += bdX * br;
		this.backgroundTop += bdY * br;

		//$('.background').css('background-position', (this.backgroundLeft - 330) + 'px ' + (this.backgroundTop - 330) + 'px');
	},

	/**
	 * Draw the next animation frame for the 'earth' tab
	 */
	earthEvents: function earthEvents() {
		"use strict";

		var event, borderTolerance,
			x, y,
			dXl, dYl,
			d,
			d2,
			ddx, ddy,
			ratio;

		event = this.event;
		borderTolerance = 30;	// when Earth reach a border, then Earth is "moving"

		x = (event.accelerationIncludingGravity.z < 0) ?
				2*event.accelerationIncludingGravity.x : 
				-2*event.accelerationIncludingGravity.x;
		y = event.accelerationIncludingGravity.z + 0.0;

		// calculate X and Y distances between the Sun and Earth
		dXl = (this.sunX + this.sunWidth / 2 - (this.ballX + (this.ballWidth / 2))); // x distance
		dYl = (this.sunY + this.sunHeight / 2 - (this.ballY + (this.ballHeight / 2))); // y distance

		if (Math.abs(dXl) < 1) {
			dXl = dXl < 0 ? -1 : 1; // round to 1 * sign
		}
		if (Math.abs(dYl) < 1) {
			dYl = dYl < 0 ? -1 : 1; // round to 1 * sign
		}

		// distance squared
		d2 = Math.pow(dXl, 2) + Math.pow(dYl, 2);
		// distance
		d = Math.sqrt(d2);

		// acceleration is proportional to 1/d2 [a=GM/r^2]
		// X component is also proportional to dXl / d
		ddx = (this.R * dXl) / (d2 * d);
		ddy = (this.R * dYl) / (d2 * d);

		// apply acceleration to speed
		this.dX += ddx;
		this.dY += ddy;

		ratio = Math.sqrt(Math.pow(this.dX, 2) + Math.pow(this.dY, 2)) / 25; // max speed
		if (ratio > 1) { // speed limit achieved
			this.dX /= ratio;
			this.dY /= ratio;
		}

		// apply speed to Earth position
		this.ballX += this.dX;
		this.ballY += this.dY;

		// What do it when the earth leaves gravitation of the Sun?;
		if (this.ballX > (this.gameWidth + borderTolerance)) {
			this.ballX = -borderTolerance; this.deceleration();
		}
		if (this.ballY > (this.gameHeight + borderTolerance)) {
			this.ballY = -borderTolerance; this.deceleration();
		}
		if (this.ballX < -borderTolerance) {
			this.ballX = this.gameWidth + borderTolerance; this.deceleration();
		}
		if (this.ballY < -borderTolerance) {
			this.ballY = this.gameHeight + borderTolerance; this.deceleration();
		}

		// update Earth position
		$('.ball').css('left', this.ballX + 'px');
		$('.ball').css('top', this.ballY + 'px');

		// relative depth Sun / Earth
		if (this.dY > 0) {
			$('.ball').css('z-index', 100);
		} else {
			$('.ball').css('z-index', 20);
		}

		this.earthUpdateBackgroundPosition(x, y);
		this.earthUpdateSunPosition(x, y);
	},

	/**
	 *  Checks if the ball already was on the edge in the previous step
	 *
	 *  If so, this is not a 'real' bounce - the ball is just laying on the edge
	 *  Uses globals: ballX, ballY, ballWidth, ballHeight, gameWidth, gameHeight
	 *
	 *  @return {Object}
	 */
	shouldVibrateIfHitsEdge: function shouldVibrateIfHitsEdge() {
		"use strict";
		var ret = {
			x: true,
			y: true
		};

		if (this.ballX <= 0) {
			ret.x = false;
		} else if ((this.ballX + this.ballWidth) >= this.gameWidth) {
			ret.x = false;
		}
		if (this.ballY <= 0) {
			ret.y = false;
		} else if ((this.ballY + this.ballHeight) >= this.gameHeight) {
			ret.y = false;
		}

		return ret;
	},

	/**
	 * Draw the next animation frame for the 'ball' tab
	 */
	ballEvents: function ballEvents() {
		"use strict";
		var event,
			x,
			y,
			stickTop = 0,
			stickLeft = 0,
			stickBottom = 0,
			stickRight = 0,
			rX,
			rY,
			ddx,
			ddy,
			shouldVibrate = null,
			isHittingEdge = null;

		event = this.event;

		x = (event.accelerationIncludingGravity.z < 0) ?
			2*event.accelerationIncludingGravity.x : 
			-2*event.accelerationIncludingGravity.x;
		y = event.accelerationIncludingGravity.z + 0.0;

		stickTop = 0;
		stickLeft = 0;
		stickBottom = 0;
		stickRight = 0;

		rX = this.ballX;
		rY = this.ballY;
		ddx = x * -this.cdd;
		ddy = y * this.cdd;
		this.dX += ddx;
		this.dY += ddy;
		this.dX *= this.resistance;
		this.dY *= this.resistance;

		shouldVibrate = this.shouldVibrateIfHitsEdge();

		this.ballX += this.dX;
		this.ballY += this.dY;

		if (this.ballX < 0) {
			this.ballX = 0;
			this.dX = Math.abs(this.dX) * this.friction - this.frictionC;
			this.dY *= this.sideFriction;
			stickLeft = 1;
		} else if ((this.ballX + this.ballWidth) > this.gameWidth) {
			this.ballX = this.gameWidth - this.ballWidth;
			this.dX = -Math.abs(this.dX) * this.friction + this.frictionC;
			this.dY *= this.sideFriction;
			stickRight = 1;
			if (this.ballX < 0) {
				this.ballX = 0;
			}
		}

		if (this.ballY < 0) {
			this.ballY = 0;
			this.dY = Math.abs(this.dY) * this.friction - this.frictionC;
			this.dX *= this.sideFriction;
			stickTop = 1;
		} else if ((this.ballY + this.ballHeight) > this.gameHeight) {
			this.ballY = this.gameHeight - this.ballHeight;
			this.dY = -Math.abs(this.dY) * this.friction + this.frictionC;
			this.dX *= this.sideFriction;
			stickBottom = 1;
			if (this.ballY < 0) {
				this.ballY = 0;
			}
		}

		isHittingEdge = {
			x: (stickLeft || stickRight) && Math.abs(this.dX) > 1,
			y: (stickTop || stickBottom) && Math.abs(this.dY) > 1
		};

		// if on the edge and the hitting speed is high enough
		if ((shouldVibrate.x && isHittingEdge.x) || (shouldVibrate.y && isHittingEdge.y)) {
			if (typeof navigator.webkitVibrate === 'function') {
				navigator.webkitVibrate(100);
			} else {
				navigator.vibrate(100);
			}
		}

		$('.ball').css('left', this.ballX + 'px');
		$('.ball').css('top', this.ballY + 'px');

		rX = this.ballX - rX;
		rY = this.ballY - rY;

	},

	/**
	 * Draw the next animation frame
	 */
	fun: function fun() {
		"use strict";
		if (this.event) {
			switch (this.current) {
			case 'ball':
				this.ballEvents();
				break;
			case 'earth':
				this.earthEvents();
				break;
			case 'baloon':
				this.ballEvents();
				break;
			default:
				console.warn("Incorrect current mode");
				this.ballEvents();
			}
		}

		// animation - go to next step;
		if (this.timeout !== null) {
			clearTimeout(this.timeout);
		}
		this.timeout = setTimeout(this.fun.bind(this), this.animationInterval);
	},

	/**
	 * Switch to the 'ball' tab
	 */
	startBall: function startBall() {
		"use strict";

		$('.ui-content').removeClass('background1 background2 background3').addClass('background1');
		$(':jqmData(role="controlbar")').find('.ui-btn').removeClass('ui-btn-hover-s ui-btn-down-s');
		this.gameHeight = $('.background').outerHeight();

		this.cdd = -0.3;
		this.resistance = 0.98;
		this.friction = 0.90;
		this.sideFriction = 0.95;
		this.frictionC = 0.002;

		this.current = 'ball';

		$('#sun').remove();
		$('.ball').attr('src', './images/ball1.png');
		$('.ball').css('width', '186px');
		$('.ball').css('height', '186px');

		//$('.background').css('background-position', '0px -90px');

		this.ballWidth = parseInt($('.ball').css('width'), 10);
		this.ballHeight = parseInt($('.ball').css('height'), 10);
	},

	/**
	 * Switch to the 'sky' tab
	 */
	startSky: function startSky() {
		"use strict";
		$('.ui-content').removeClass('background1 background2 background3').addClass('background2');
		$(':jqmData(role="controlbar")').find('.ui-btn').removeClass('ui-btn-hover-s ui-btn-down-s');
		this.gameHeight = $('.background').outerHeight();

		this.cdd = 0.05;
		this.resistance = 0.90;
		this.friction = 0.98;
		this.sideFriction = 0.95;
		this.frictionC = 0.002;

		this.current = 'baloon';

		$('#sun').remove();
		$('.ball').attr('src', './images/balloon.png');
		$('.ball').css('width', '100px');
		$('.ball').css('height', '100px');

		//$('.background').css('background-position', '0px -80px');

		this.ballWidth = parseInt($('.ball').css('width'), 10);
		this.ballHeight = parseInt($('.ball').css('height'), 10);
	},

	/**
	 * Switch to the 'space' tab
	 */
	startSpace: function startSpace() {
		"use strict";
		var backgroundPosition, arrayPos;

		$('.ui-content').removeClass('background1 background2 background3').addClass('background3');
		$(':jqmData(role="controlbar")').find('.ui-btn').removeClass('ui-btn-hover-s ui-btn-down-s');

		this.gameHeight = $('.background').outerHeight();

		this.friction = 0.60; // bounce
		this.sideFriction = 0.95;
		this.frictionC = 0.0;

		this.current = 'earth';

		$('.ball').attr('src', './images/earth.png');
		$('#model').append('<img id="sun" class="sun" src="./images/sun.png" style="display: none;"></img>');

		this.sunX = (this.gameWidth - parseInt($('#sun').css('width'), 10)) / 2;
		this.sunY = (this.gameHeight - parseInt($('#sun').css('height'), 10)) / 2;
		$('.ball').css('width', '50px');
		$('.ball').css('height', '50px');

		//$('.background').css('background-position', '0px 0px');

		this.ballWidth = parseInt($('.ball').css('width'), 10);
		this.ballHeight = parseInt($('.ball').css('height'), 10);
		this.sunWidth = parseInt($('#sun').css('width'), 10);
		this.sunHeight = parseInt($('#sun').css('height'), 10);

		backgroundPosition = $('.background').css('background-position');

		arrayPos = backgroundPosition.split(' ');
		this.backgroundTop = parseInt(arrayPos[0], 10);
		this.backgroundLeft = parseInt(arrayPos[1], 10);
		this.backgroundWidth = parseInt($('.background').css('width'), 10);
		this.backgroundHeight = parseInt($('.background').css('height'), 10);
	},

	saveSensorData: function saveSensorData(event) {
		"use strict";
		this.event = event;
	},

  	canvasApp: function canvasApp( cv ) {
		var cv = this.cv = cv,
			ctx = cv.getContext('2d');
      	cv.id = "layer1";
      	cv.alt = "Ball View";
      	cv.width = "360";
      	cv.height = "360";
		window.xRatio = cv.width/screen.availWidth;
		window.yRatio = cv.height/screen.availHeight;
		xRatio = (xRatio === xRatio)? xRatio : 1.0;
		yRatio = (yRatio === yRatio)? yRatio : 1.5;
		Debugger.log("App Started! W:"+ cv.width +" H:"+ cv.height);
		Debugger.log("Screen Ratio W:"+ xRatio +" H:"+ yRatio);
		ctx.fillStyle = "rgba(0%, 0%, 0%, 0.5)";
		ctx.fillRect(0, 0, cv.width, cv.height);
		
		window.canvasFigures = [];
		
		canvasFigures.push( new canvasFigure( "ball1", $(".ball"), 		
			function( ctx ) {
				ctx.save();
				ctx.translate(this.x*xRatio, this.y*yRatio);
				//ctx.scale( xRatio, yRatio );
				this.x = this.$dom.offset()['left'];
				this.y = this.$dom.offset()['top'];
				frequencyHandler(this.x/cv.width);
				qFactorHandler(this.y/cv.width);
				ctx.fillStyle = "#FFFFFF";
				ctx.strokeStyle = "#FFFFFF";
				ctx.lineWidth = "2";
				ctx.beginPath();
				ctx.arc(50, 50, 50, 0, Math.PI*2); 
				ctx.closePath();
				ctx.stroke();
				ctx.restore();
			} 
		) );
		
		function draw(ctx) {
			ctx.restore();
			ctx.clearRect(0, 0, cv.width, cv.height);
			//ctx.fillStyle = "rgba(0%, 0%, 0%, 0.5)";
			//ctx.fillRect(0, 0, cv.width, cv.height);
			canvasFigures[0].draw(ctx);
		}
		
		/* Begin draw loop */
  		try {
			var time = 0;
    		var drawLoop = setInterval(draw,31,ctx);
    		Debugger.log("Draw loop started");
			var appStarted = true;
			return appStarted;
  		} catch(e) { 
    		Debugger.log("drawLoop failed to start"); 
			Debugger.log(e.message);
    		return;
  		}
		
	}

};

function canvasFigure( id, $dom, drawFunc ) {
	var id = this.id = id,
		x = this.x,
		y = this.y,
		z = this.z,
		$dom = this.$dom = $dom;
	
		x = $dom.css('left');
		y = $dom.css('top');
		
		canvasFigure.prototype.draw = drawFunc;
}

function webAudioInit() {
    var context;
    var soundSource;
    var filter;
    var url = "sample.mp3";
    var soundSpectrum;
    var audioAnalyser;
    var bufferData;
    var isLoaded = false;

    /**
    * Step 1 - Initialise the Audio Context
    * There can be only one!
    */
    this.init = function () {
        if (typeof AudioContext !== "undefined") {
            context = new AudioContext();
        } else if (typeof webkitAudioContext !== "undefined") {
            context = new webkitAudioContext();
        } else {
            throw new Error("AudioContext not supported.");
        }

        if (context) {
            this.setSound();
        }
    }

    /**
    * Step 2: Load our Sound using XHR
    */
    this.setSound = function () {
        //this loads asynchronously
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        //Our asynchronous callback
        request.onload = function () {
            startSound(request.response);
        };

        request.send();
    }

    /**
    * audio play control
    */
    this.playSound = function () {
        document.querySelector('.play').style.display = 'none';
        //document.querySelector('.stop').style.display = 'inline';

        if (soundSource.playbackState ==2)
            return;

        //re-create the source node
        if (soundSource.playbackState != 0) {
            if (soundSource.playbackState != 3)
                soundSource.noteOff(context.currentTime);
            startSound();
        }

        //play the source now
        soundSource.noteOn(context.currentTime);

        //Declare spectrum
        //soundSpectrum = setInterval(canvasSpectrum, 50);
        soundSpectrum = setTimeout(canvasSpectrum, 50);
		
    }

    /**
    * audio stop control
    */
    this.stopSound = function () {
        //stop the source now
        try {
            document.querySelector('.play').style.display = 'inline';
            //document.querySelector('.stop').style.display = 'none';

            if (soundSource.playbackState == 3)
                return;

            if (soundSource.playbackState != 0) {
                soundSource.noteOff(context.currentTime);
                clearInterval(soundSpectrum);
             }
        } catch(e) {
            console.log("SoundSource already was stopped.");
        }
    }

    /**
    * audio volume control
    */
    this.volumeHandler = function () {
        //stop the source now
        var value = this.value;
        volumeNode.gain.value = value;
    }

    /**
    * audio qFactor control
    */
    this.qFactorHandler = function (value) {
        //stop the source now
        var value = value || this.value;
        filter.Q.value = value * 10;
    }

    /**
    * audio frequency control
    */
    this.frequencyHandler = function (value) {
        //stop the source now
        var value = value || this.value;
        filter.frequency.value = value * 100;

    }

    /**
    * audio gain control
    */
    this.gainHandler = function () {
        //stop the source now
        var value = this.value;
        filter.gain.value = value * 10;
    }

    /**
    * audio filter control
    */
    this.filterTypeHandler = function (value) {
        //var value = e.target.value;
        //Allow changing filters while not playing.
        //if (soundSource.playbackState != 2) return;

        filterTypeActive(value);
        //filterDisabled(value);

        //Disconnect to replace filter
        filter.disconnect(0);

        //filter Type setting
        filter.type = value;

        //After replacement, re-connect to the Node in use
        filter.connect(audioAnalyser);
    }


    /**
    * audio filterType Active control
    */
    this.filterTypeActive = function (value) {
        var filterBtn = document.querySelectorAll('.filter-btn button');

        for (var i = 0; i < filterBtn.length; i++) {
            if (filterBtn[i].innerHTML == value)
                filterBtn[i].className = "active";
            else
                filterBtn[i].className = "";
        }
    }

    /**
    * audio q factor,gain disabled control
    */
    this.filterDisabled = function (value) {
        var range = document.querySelectorAll('.range');
        var qFactor = document.getElementById('range_qFactor');
        var gain = document.getElementById('range_gain');

        for (var i = 0; i < range.length; i++) {
            range[i].disabled = false;
            range[i].style.opacity = 1;
        }

        switch (value) {
            case "lowpass":
                gain.disabled = true;
                gain.style.opacity = .5;
                break;
            case "highpass":
                gain.disabled = true;
                gain.style.opacity = .5;
                break;
            case "bandpass":
                gain.disabled = true;
                gain.style.opacity = .5;
                break;
            case "lowshelf":
                qFactor.disabled = true;
                qFactor.style.opacity = .5;
                break;
            case "highshelf":
                qFactor.disabled = true;
                qFactor.style.opacity = .5;
                break;
            case "notch":
                gain.disabled = true;
                gain.style.opacity = .5;
                break;
            case "allpass": gain.disabled = true;
                gain.style.opacity = .5;
                break;
            default: break;
        }
    }

    /**
    * This is the code we are interested in:
    */
    this.startSound = function (audioData) {
		Debugger.log( "Sound recieved" );
        soundSource = context.createBufferSource();
        soundSource.loop = true;
        if (audioData) {
            context.decodeAudioData(audioData, function (buffer) {
                var obj = document.getElementById("loadtoplay");
                isLoaded = true;
                obj.innerHTML = "Play";
				Debugger.log( "Play button set to "+  obj.value);
                bufferData = buffer;
                soundSource.buffer = bufferData;
                setTimeout(playSound, 15000);
            }, this.onDecodeError);

            volumeNode = context.createGainNode();
            filter = context.createBiquadFilter();
            audioAnalyser = context.createAnalyser();

            //Connect node
            soundSource.connect(volumeNode);
            volumeNode.connect(filter);
            filter.connect(audioAnalyser);
            audioAnalyser.connect(context.destination);

            //Basic setting
            volumeNode.gain.value = 5;
            filter.type = "highpass";
            audioAnalyser.maxDecibels = 40;
            audioAnalyser.smoothingTimeConstant = 0.5;
            soundSource.loop = true;
        } else {
            soundSource.buffer = bufferData;
            soundSource.connect(volumeNode);
            filterTypeActive(filter.type);
        }
    }

    this.onDecodeError = function (e) {
        console.log("decode error");
        return;
    }

    /**
    * spectrum rendering
    */
    this.canvasSpectrum = function () {
        var canvas = document.querySelector('canvas');
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var bar_width = 10;
        var gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(1, "#0000FF");
        gradient.addColorStop(0.5, "#cc9933");
        gradient.addColorStop(0.7, "#ffcc99");
        gradient.addColorStop(0, "#FF0000");

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = gradient;
		canvasFigures[0].draw = function( ctx ) {
				ctx.save();
				ctx.translate(this.x*xRatio, this.y*yRatio);
        		var freqByteData = new
				Uint8Array(audioAnalyser.frequencyBinCount);
        		audioAnalyser.getByteFrequencyData(freqByteData);
				this.x = this.$dom.offset()['left'];
				this.y = this.$dom.offset()['top'];
				frequencyHandler(this.y/cv.height);
				qFactorHandler(this.x/cv.width);
				ctx.strokeStyle = gradient;
				ctx.lineWidth = "4";
				//ctx.scale(this.y%4, 1.0);
				ctx.beginPath();
				for (var i = 0; i < 28; i+=4) {
            		var magnitude = freqByteData[i];
					gradient.addColorStop((magnitude/255.0), "rgb("+freqByteData[i+1]%127+128+","+freqByteData[i+2]%127+128+","+freqByteData[i+2]%127+128+")");
					//ctx.rotate(Math.PI/4);
					ctx.arc(50, 50, magnitude, 0, Math.PI*2);
					//ctx.strokeRect(0, 0, magnitude, magnitude);
					ctx.closePath();
				}
				ctx.stroke();
				ctx.restore();
			};
		/*
        var barCount = Math.round(width / bar_width);
        for (var i = 0; i < barCount; i++) {
            var magnitude = freqByteData[i];

            //some values need adjusting to fit on the canvas
            //ctx.fillRect(bar_width * i, height, bar_width - 2, -magnitude + 20);
        }
		*/
    }

    function stateChanged() {
        if (document.webkitHidden)
            stopSound();
        else {
            if (isLoaded)
                startSound();
            else
                setSound();
        }
    }

    //Events for visibility
    document.addEventListener("webkitvisibilitychange", stateChanged);

    //Events for the play/stop bottons
    document.querySelector('.play').addEventListener("click", this.playSound);
    document.querySelector('.stop').addEventListener("click", this.stopSound);
/*
    //Events for volume
    document.querySelector('#range_volume').addEventListener("change", this.volumeHandler);

    //Events for q factor
    document.querySelector('#range_qFactor').addEventListener("change", this.qFactorHandler);

    //Events for frequency
    document.querySelector('#range_frequency').addEventListener("change", this.frequencyHandler);

    //Events for gain
    document.querySelector('#range_gain').addEventListener("change", this.gainHandler);

    //Events for filter (lowpass, highpass, bandpass, lowshelf, highshelf, eaking, notch, allpass)
    var filterBtn = document.querySelectorAll('.filter-btn button');
    for (var i = 0; i < filterBtn.length; i++) {
        filterBtn[i].addEventListener("click", filterTypeHandler);
    }
*/
    this.init();
}

function load(mainID) {
	"use strict";
	var canvas=document.createElement("canvas");
	document.getElementById(mainID).replaceChild( canvas, document.getElementById("layer1") );
	setTimeout(app.canvasApp, 333, canvas);
	if (typeof Debugger === "function") { 
		Debugger.on = true;
	} else {
		window.Debugger = {
			log: function() {
				/* no debugger.js */
			}
		};
	}
	
	var img,
		contentHeight = screen.availHeight;

	$('div[data-role="content"]').css('height', contentHeight);
	app.gameWidth = screen.availWidth;
	app.ballWidth = parseInt($('.ball1').css('width'), 10);
	app.ballHeight = parseInt($('.ball').css('height'), 10);

	window.addEventListener('devicemotion', app.saveSensorData.bind(app), false);

	app.fun();

	$(window).on('tizenhwkey', function (e) {
		if (e.originalEvent.keyName === "back") {
			tizen.application.getCurrentApplication().exit();
		}
	});

	$('#mainPage').on('pageshow', function () {
		app.startBall();
	});

	document.addEventListener('webkitvisibilitychange', function (event) {
		if (document.webkitVisibilityState === 'visible') {
			app.fun();
		}
	});

	// Preload backgrounds;
	img = $('<img>').hide();
	img.attr('src', 'images/background1.png');
	
	$(window).resize(function () {
		'use strict';
		app.gameWidth = screen.availWidth;
		app.gameHeight = screen.availHeight;
	});
	
    webAudioInit();
	setSound();
}