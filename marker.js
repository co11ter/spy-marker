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
    var utils = {
        base64_encode: function(data) {
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
        },
        addEvent: function(event, fn, context) {
            if(context===undefined) {
                context = document;
            }
            if(context.addEventListener) {
                context.addEventListener(event, fn, false)
            } else {
                context.attachEvent("on"+event, fn);
            }
        },
        removeEvent: function(event, fn, context) {
            if(context===undefined) {
                context = document;
            }
            if(context.removeEventListener) {
                context.removeEventListener(event, fn, false)
            } else {
                context.detachEvent("on"+event, fn);
            }
        }
    };

    var storage = function(options) {
        this.config = Object.assign(this.config, options);

        if(this.config.useLocalStorage && this._hasLocalStorage() && this._isEmptyLocalStorage()) {
            this.data = this._data;
        }
    };

    storage.prototype = {
        config: {
            storkey: 'marker123',
            useLocalStorage: true
        },
        _data: {
            scrollY: [],
            scrollMove: 0,
            mouseXY: [],
            mouseMove: 0,
            url: location.href
        },
        get data() {
            if(this.config.useLocalStorage && this._hasLocalStorage()) {
                this._data = JSON.parse(window.localStorage.getItem(this.config.storkey));
            }
            return this._data;
        },
        set data(value) {
            this._data = value;
            if(this.config.useLocalStorage && this._hasLocalStorage()) {
                window.localStorage.setItem(this.config.storkey, JSON.stringify(this._data));
            }
        },
        constructor: storage,
        _hasLocalStorage: function() {
            return typeof window.localStorage === 'object';
        },
        _isEmptyLocalStorage: function() {
            return window.localStorage.getItem(this.config.storkey)===null;
        },
        merge: function(obj) {
            this.data = Object.assign(this.data, obj);
        },
        pushMouseData: function(x, y) {
            var data = this.data;
            if(data.mouseXY.length>0) {
                var last = data.mouseXY[data.mouseXY.length-1];
                data.mouseMove += Math.round(Math.sqrt(Math.pow(last.x - x, 2)+Math.pow(last.y - y, 2)));
            }
            data.mouseXY.push({x: x, y: y});
            this.data = data;
        },
        pushScrollData: function(y) {
            var data = this.data;
            if(data.scrollY.length>0) {
                var last = data.scrollY[data.scrollY.length-1];
                data.scrollMove += Math.max(last, y) - Math.min(last, y);
            }
            data.scrollY.push(y);
            this.data = data;
        },
        fetch: function() {
            return this.data;
        },
        clear: function() {
            var data = this.data;
            data.scrollY = [];
            data.scrollMove = 0;
            data.mouseXY = [];
            data.mouseMove = 0;
            this.data = data;
        },
        size: function() {
            var data = this.data;
            return data.scrollY.length + data.mouseXY.length;
        }
    };

    var sender = function(options) {
        this.config = Object.assign(this.config, options);
    };

    sender.prototype = {
        config: {
            iframe: true,
            url: 'http://localhost/test?param=1', // url for send data
            sendTimeout: 1000 // one sec
        },
        sending: false,
        constructor: sender,
        send: function(data) {
            if(this.sending)
                return false;

            var that = this;

            this.sending = true;
            setTimeout(function(){
                that.sending = false;
            }, this.config.sendTimeout);

            var url = this.config.url +
                '&data=' + utils.base64_encode(JSON.stringify(data));

            var el = document.createElement((this.config.iframe ? 'iframe' : 'img'));
            el.src = url;
            el.style.display = "none";
            document.body.appendChild(el);

            return true;
        }
    };

    window.marker = function (options) {
        var that = this;

        this.config = Object.assign(this.config, options.marker || {});

        this.sender = new sender(options.sender || {});
        this.storage = new storage(options.storage || {});
        this.compress = compressor();
        this.initEvents();

        function compressor() {
            var counter = 0;
            return function (x, y) {
                if (!(counter % that.config.stepSkip)) {
                    that.storage.pushMouseData(x, y);
                }
                counter++;
            }
        }
    };

    window.marker.prototype = {
        config: {
            sizeForSend: 50, // data pack size
            stepSkip: 10, // save step for mouse move (for example every 10th will save)
            listenTime: 30 * 60 * 1000 // end listen time (in mins)
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

            utils.addEvent('bufferOverflow', send);
            utils.addEvent('beforeunload', send, window);
            utils.addEvent('blur', send, window);
            utils.addEvent('mouseout', out);
            utils.addEvent('mousemove', mouse);
            utils.addEvent('scroll', scroll);

            setTimeout(function () {
                utils.removeEvent('bufferOverflow', send);
                utils.removeEvent('beforeunload', send, window);
                utils.removeEvent('blur', send, window);
                utils.removeEvent('mouseout', out);
                utils.removeEvent('mousemove', mouse);
                utils.removeEvent('scroll', scroll);
                that.send();
            }, that.config.listenTime);
        },
        send: function () {
            var data = this.storage.fetch();
            if(this.sender.send(data))
                this.storage.clear();
        },
        checkBufferSize: function () {
            var over = this.storage.size() >= this.config.sizeForSend;
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
            this.storage.pushScrollData(y);
            this.checkBufferSize();
        }
    };
})(window);