// Object.assign polyfill todo need remove.
if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function(target, firstSource) {
            'use strict';
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert first argument to object');
            }

            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource === undefined || nextSource === null) {
                    continue;
                }

                var keysArray = Object.keys(Object(nextSource));
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
            return to;
        }
    });
}
(function (window) {
    window.marker = function (options) {
        var that = this;

        this.config = Object.assign(this.config, options);
        this.compress = compressor();
        this.initEvents();

        function compressor() {
            var counter = 0;
            return function (x, y) {
                if (!(counter % that.config.stepSkip)) {
                    if(that.data.mouseXY.length>0) {
                        var last = that.data.mouseXY[that.data.mouseXY.length-1];
                        that.data.mouseMove += Math.round(Math.sqrt(Math.pow(last.x - x, 2)+Math.pow(last.y - y, 2)));
                    }
                    that.data.mouseXY.push({x: x, y: y});
                }
                counter++;
            }
        }
    };

    window.marker.prototype = {
        config: {
            sizeForSend: 50, // data pack size
            url: 'http://localhost/test?param=1', // url for send data
            stepSkip: 10, // save step (for example every 10th will save)
            timeout: 30 * 60 * 1000 // end script length (in mins)
        },
        sendCounter: 0,
        data: {
            scrollY: [],
            scrollMove: 0,
            mouseXY: [],
            mouseMove: 0,
            url: location.href
        },
        constructor: marker,
        initEvents: function () {
            var that = this,
                send = that.send.bind(that),
                mouse = that.handleMouseMove.bind(that),
                scroll = that.handleScroll.bind(that),
                out = function(e) {
                    e = e ? e : window.event;
                    var from = e.relatedTarget || e.toElement;
                    if (!from || from.nodeName == "HTML") {
                        that.send();
                    }
                };

            addEvent('bufferOverflow', send, false);
            addEvent('beforeunload', send, false);
            addEvent('mouseout', out, false);
            addEvent('mousemove', mouse, false);
            addEvent('scroll', scroll, false);

            setTimeout(function () {
                removeEvent('bufferOverflow', send, false);
                removeEvent('beforeunload', send, false);
                removeEvent('mouseout', out, false);
                removeEvent('mousemove', mouse, false);
                removeEvent('scroll', scroll, false);
                that.send();
            }, that.config.timeout);

            function addEvent(event, fn) {
                if(document.addEventListener) {
                    document.addEventListener(event, fn, false)
                } else {
                    document.attachEvent("on"+event, fn);
                }
            }

            function removeEvent(event, fn) {
                if(document.removeEventListener) {
                    document.removeEventListener(event, fn, false)
                } else {
                    document.detachEvent("on"+event, fn);
                }
            }
        },
        send: function () {
            var url = this.config.url +
                '&data=' + base64_encode(JSON.stringify(this.data));

            // safari setting third party cookies by iframe
            if(!this.sendCounter && navigator.userAgent.indexOf('Safari')!=-1 && navigator.userAgent.indexOf('Chrome')==-1) {
                var iframe = document.createElement('iframe');
                iframe.src = url+'&iframe=true';
                iframe.style.display = "none";
                document.body.appendChild(iframe);
            } else {
                var img = document.createElement('img');
                img.src = url;
                img.style.display = "none";
                document.body.appendChild(img);
            }

            this.data.scrollY = [];
            this.data.scrollMove = 0;
            this.data.mouseXY = [];
            this.data.mouseMove = 0;

            this.sendCounter++;

            function base64_encode(data) {
                var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, enc = '';

                do { // pack three octets into four hexets
                    o1 = data.charCodeAt(i++);
                    o2 = data.charCodeAt(i++);
                    o3 = data.charCodeAt(i++);

                    bits = o1 << 16 | o2 << 8 | o3;

                    h1 = bits >> 18 & 0x3f;
                    h2 = bits >> 12 & 0x3f;
                    h3 = bits >> 6 & 0x3f;
                    h4 = bits & 0x3f;

                    // use hexets to index into b64, and append result to encoded string
                    enc += b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
                } while (i < data.length);

                switch (data.length % 3) {
                    case 1:
                        enc = enc.slice(0, -2) + '==';
                        break;
                    case 2:
                        enc = enc.slice(0, -1) + '=';
                        break;
                }

                return enc;
            }
        },
        checkBufferSize: function () {
            var over = (this.data.scrollY.length + this.data.mouseXY.length) >= this.config.sizeForSend;
            if(over) {
                var e = document.createEvent('Event');
                e.initEvent('bufferOverflow', true, true);
                if(document.fireEvent) {
                    document.fireEvent('onbufferOverflow', e);
                } else {
                    document.dispatchEvent(e);
                }
            }
            return over;
        },
        handleMouseMove: function (e) {
            var x, y;
            if (document.all) {
                x = event.x + document.body.scrollLeft;
                y = event.y + document.body.scrollTop;
            } else {
                x = e.pageX;
                y = e.pageY;
            }
            this.compress(x, y);

            this.checkBufferSize();
        },
        handleScroll: function (e) {
            var y = Math.round(window.pageYOffset || document.documentElement.scrollTop);

            if(this.data.scrollY.length>0) {
                var last = this.data.scrollY[this.data.scrollY.length-1];
                this.data.scrollMove += Math.max(last, y) - Math.min(last, y);
            }
            this.data.scrollY.push(y);

            this.checkBufferSize();
        },
        setCustomData: function(fn) {
            if(typeof fn!=='function')
                throw new Error('customData is not function');
            fn(this.data);
        }
    };
})(window);