/*
 *	champion.js - 0.0.1
 *	Contributors: Jeff Taylor, Kyle Schattler
 *	Description: Yet another frontend MVP JS framework
 *	Source: https://github.com/JeffreyTaylor/champion.git
 *	Champion may be freely distributed under the MIT license
 */

;(function($, undefined) { 
	'use strict';

	// Source: src/champion.js
	var champ = this.champ = {},
	    
	    debug = champ.debug = {
	        on: false,
	        log: function() {
	            if(this.on && console.log) { console.log.apply(console, arguments); }
	        }
	    },
	    
	    DOMEvents = champ.DOMEvents = [
	        'blur', 'focus', 'focusin', 'focusout', 'load', 'resize', 'scroll',
	        'unload', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 
	        'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'change', 'select',
	        'submit', 'keydown', 'keypress', 'keyup', 'error'
	    ];
	
	this.champ.views = {};
	this.champ.models = {};
	this.champ.presenters = {};

	// Source: src/util/extend.js
	champ.extend = function (obj, proto, skip) {
		skip = skip || [];
	
	    for (var name in proto) {
	    	for(var i=0; i<skip.length; i++) { 
	    		if(skip[i] in proto) { continue; }
	    	}
	
	        obj[name] = proto[name];
	    }
	
	    return obj;
	};

	// Source: src/util/class.js
	var Class = champ.Class = function Class(name, options) {
	    Class.init = Class.init || true;
	    this.properties = options || {};
	    if(Class.init) { this.init(options); }
	};
	
	Class.prototype = champ.extend(Class.prototype, {
	    init: function(options) {},
	
	    get: function(prop) {
	        if(typeof prop !== 'string') {
	            var obj = {};
	            for(var i=0; i<prop.length; i++) {
	                obj[prop[i]] = this.get(prop[i]);
	            }
	
	            return obj;
	        }
	
	        if(!prop in this.properties) { throw 'Property does not exist'; }
	        return this.properties[prop];
	    },
	
	    set: function(prop, val) {
	        if(typeof prop !== 'string') {
	            for(var key in prop) { 
	                if(!prop.hasOwnProperty(key)) { continue; }
	                this.set(key, prop[key]);
	            }
	            return;
	        }
	
	        if(prop.indexOf('.') === -1) { return this.properties[prop] = val; }
	        return champ.namespace.call(this.properties, prop, val);
	    }
	});
	
	Class.extend = function(props) {
	    Class.init = false;
	    var base = this,
	        proto = new this();
	    Class.init = true;
	    
	    var Base = function Class(name, options) { return base.apply(this, arguments); };
	    
	    Base.prototype = champ.extend(proto, props);
	    Base.constructor = Class;
	    Base.extend = Class.extend;
	    
	    return Base;
	};

	// Source: src/util/namespace.js
	champ.namespace = function namespace(names, val) {
	    if(typeof(names) === 'string') { return namespace.call(this, names.split('.'), val); }
	    
	    var name = names.splice(0, 1);
	    this[name] = this[name] || {};
	    
	    if(names.length === 0) { return this[name] = val || this[name]; }
	
	    return namespace.call(this[name], names, val);
	};

	// Source: src/event.js
	var events = champ.events = (function () {
	    var _subscribers = {};
	    
	    return {
	        trigger: function (topic, data) {
	            var subs = _subscribers[topic] || [];
	
	            for (var sub in subs) {
	                subs[sub](data, topic);
	            }
	        },
	
	        on: function (topic, handler) {
	            _subscribers[topic] = _subscribers[topic] || [];
	            _subscribers[topic].push(handler);
	        },
	
	        off: function (topic, handler) {
	            var subs = _subscribers[topic] || [];
	            
	            for (var i = 0; i < subs.length; i++) {
	                if ('' + subs[i] == '' + handler) {
	                    subs.splice(i, 1);
	                }
	            }
	        }
	    };
	})();

	// Source: src/router.js
	// disclaimer:
	
	// this code will be cleaned up. -- I promise!
	
	//todo
	// 1) add query string parsing
	// 2) add fallbacks for browsers that don't support push/popstate
	
	
	(function (champ, window, document) {
	
	    var _routes = [],
	        _isRouterStarted = false,
	        _isHtml5Supported = null,// to be set below.
	        _currentHash = null,
	        _settings = {
	            html5Mode: true
	        },
	        router = {};
	
	    var start = function () {
	
	        _isHtml5Supported = !!('pushState' in window.history);
	
	        onInitialLoad();
	
	        setupListeners();
	    };
	
	    var setupListeners = function () {
	
	        window.addEventListener('load', onInitialLoad , false);
	
	        window.addEventListener('click', onClick, false);
	
	        if (_isHtml5Supported == true) {
	
	            window.addEventListener('popstate', onPopState, false);
	
	        }
	        else {
	
	            startHashMonitoring();
	
	        }
	
	    };
	
	    var onPopState = function (e) {
	
	        matchRoute(document.location.pathname);
	    };
	
	    var onInitialLoad = function () {
	
	        if (_isRouterStarted == false) {
	            matchRoute(document.location.pathname);
	            _isRouterStarted = true;
	        }
	
	    };
	
	    var onClick = function (e) {
	
	        if (1 != which(e)) return;
	        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
	        if (e.defaultPrevented) return;
	
	        // ensure link
	        var el = e.target;
	        while (el && 'A' != el.nodeName) el = el.parentNode;
	        if (!el || 'A' != el.nodeName) return;
	
	        // ensure non-hash for the same path
	        var link = el.getAttribute('href');
	        if (el.pathname == location.pathname && (el.hash || '#' == link)) return;
	
	        // check target
	        if (el.target) return;
	
	        // x-origin
	        if (!sameOrigin(el.href)) return;
	
	        // rebuild path
	        var path = el.pathname + el.search + (el.hash || '');
	
	        // same page
	        var orig = path + el.hash;
	
	        path = path.replace('/', '');
	        if ('/' && orig == path) return;
	
	        e.preventDefault();
	
	        forceChange(orig);
	    };
	
	    var startHashMonitoring = function () {
	
	        setInterval(function () {
	            var newHash = window.location.href;
	
	            if (_currentHash !== newHash) {
	                _currentHash = newHash;
	                matchRoute(document.location.pathname);
	            }
	        });
	
	    };
	
	    var forceChange = function (route) {
	
	        if (matchRoute(route) == true) {
	
	            if (_isHtml5Supported) {
	                //state null for now
	                window.history.replaceState(null, window.document.title, getBase() + route)
	            }
	            else {
	
	                window.location.hash = route;
	
	            }
	
	        }
	    };
	
	    var parseRoute = function (path) {
	
	        var nameRegex = new RegExp(":([^/.\\\\]+)", "g"),
	            newRegex = "" + path,
	            values = nameRegex.exec(path);
	
	        if (values != null) {
	
	            newRegex = newRegex.replace(values[0], "([^/.\\\\]+)");
	        }
	
	        newRegex = newRegex + '$';
	
	        return {regex: new RegExp(newRegex)};
	
	    };
	
	    var matchRoute = function (url) {
	
	        for (var i = 0; i < _routes.length; i++) {
	
	            var route = _routes[i],
	                match = route.params.regex.exec(url);
	
	            if (!match) {
	                continue;
	            }
	
	            route.callback({url: url});
	
	            return true;
	        }
	
	        return false;
	
	    };
	
	    var getBase = function () {
	
	        var base = window.location.protocol + '//' + window.location.hostname;
	
	        if (window.location.port) {
	
	            base += ':' + window.location.port;
	        }
	
	        return base;
	
	    };
	
	    var which = function (e) {
	
	        e = e || window.event;
	
	        var result = e.which == null ? e.button : e.which;
	
	        return result;
	    };
	
	    var sameOrigin = function (href) {
	
	        return  href.indexOf(getBase()) == 0;
	    };
	
	    start();
	
	    router.addRoute = function (route, callback) {
	        _routes.push({params: parseRoute(route), callback: callback});
	    };
	
	    champ.router = router;
	
	})(champ || {}, window, document);
	

	// Source: src/view.js
	var view = champ.view = function (name, options) {
	    if(!(this instanceof view)) { return new view(name, options); }
	    
	    options = options || {};
	    this.name = Array.prototype.splice.call(arguments, 0, 1);
	    this.container = typeof(options.container === 'string') 
	        ? $(options.container) 
	        : options.container || $('<div>');
	
	    this.DOM = options.DOM || {};
	    
	    this.registerDom(this.DOM);
	    this.registerDomEvents();
	
	    champ.extend(this, options, ['name', 'container', 'DOM']);    
	    this.init.apply(this, arguments);
	    champ.namespace('views')[name] = this;
	};
	
	champ.extend(view.prototype, {
	    init: function() {},
	    
	    addDom: function(name, element) {
	        element = this.container.find(element);
	        if(element.length > 0) {
	            this.DOM[name] = element;
	        }
	    },
	    
	    registerDom: function(dom) {
	        for(var name in dom) {
	            this.addDom(name, dom[name]);
	        }
	    },
	    
	    //Intercepts all events fired on the DOM objects in the view and fires custom events for presenters
	    registerDomEvents: function() {
	        for(var name in this.DOM) {
	            var el = this.DOM[name];
	            
	            el.on(DOMEvents.join(' '), (function(view, name) {
	                return function(e) {
	                    events.trigger('view:' + view.name + ':' + name + ' ' + e.type, e);
	                };
	            })(this, name));
	        }
	    }
	});
	
	champ.view.extend = function(options) {
	    return function(name, opts) {
	        return champ.view(name, champ.extend(options, opts));
	    };
	};

	// Source: src/model.js
	var model = champ.model = function(name, options) {
	    if(!(this instanceof model)) { return new model(name, options); }
	    
	    options = options || {};
	    this.name = Array.prototype.splice.call(arguments, 0, 1)[0] 
	        || 'model' + ((Date.now ? Date.now() : new Date().getTime()) / 1000);
	
	    this.properties = options.properties || {};
	    
	    champ.extend(this, options, ['name', 'properties']);
	    this.init.apply(this, arguments);
	    champ.namespace('models')[name] = this;
	};
	
	champ.extend(model.prototype, {
	    init: function(options) {},
	
	    property: function property(prop, val, silent) {
	        //If property isn't a string, assume it's an object literal
	        //and call property on each key value pair
	        if(typeof(prop) !== 'string') {
	            for(var key in prop) {
	                if(!prop.hasOwnProperty(key)) { continue; }
	                property.call(this, key, prop[key], val);
	            }
	
	            return;
	        }
	
	        if(!this.properties[prop] && !val) { throw 'Property doesn\'t exist'; }
	        if(!val) { return this.properties[prop]; }
	        this.properties[prop] = val;
	        
	        if(!silent) {
	            events.trigger('model:' + this.name + ':' + 'changed', {
	                property: prop,
	                value: val
	            });
	        }
	    }
	});
	
	champ.model.extend = function extend(options) {
	    function model(name, opts) {
	        return champ.model(name, opts);
	    }
	
	    model.extend = extend;
	    model.prototype = champ.extend(model.prototype, options);
	    model.prototype.constructor = this;
	
	    return model;
	};

	// Source: src/presenter.js
	var presenter = champ.presenter = function(name, options) {
	    if(!(this instanceof presenter)) { return new presenter(name, options); }
	    
	    options = options || {};
	    this.name = Array.prototype.splice.call(arguments, 0, 1);
	    this.views = options.views || {};
	    this.models = options.models || {};
	    this.events = options.events || {};
	    
	    this.register('models', this.models);
	    this.register('views', this.views);
	    this.registerViewEvents(this.events);
	    
	    champ.extend(this, options, ['name', 'views', 'models', 'events']);
	    this.init.apply(this, arguments);
	    champ.namespace('presenters')[name] = this;
	};
	
	champ.extend(presenter.prototype, {
	    init: function() {},
	    
	    register: function(name, deps) {
	        var reg = this[name] = this[name] || {};
	        
	        if(typeof(deps) === 'string') {
	            reg[deps] = champ.namespace(name)[deps];
	            return;
	        }
	        
	        for(var i=0; i<deps.length; i++) {
	            reg[deps[i]] = champ.namespace(name)[deps[i]];
	        }
	    },
	    
	    registerViewEvents: function(evts) {
	        for(var name in evts) {
	            events.on(name, this[evts[name]].bind(this));
	        }
	    }
	});
	
	champ.presenter.extend = function(options) {
	    return function(name, opts) {
	        return champ.presenter(name, champ.extend(options, opts));
	    };
	};

	// Source: src/templates/templateEngine.js
	(function (champ) {
	
	    var engine = {};
	
	    engine.render = function (template) {
	        console.log('templateengine.get still in development');
	    };
	
	    champ.templates = champ.templates || {};
	
	    champ.templates.render = engine.render;
	
	})(champ || {});
	

	// Source: src/templates/templateProvider.js
	(function (champ, $) {
	
	    var provider = {},
	        templateCache = {}
	
	    var makeRequest = function (name) {
	
	            var dfd = $.Deferred(),
	                promise = dfd.promise();
	
	            var request = $.ajax({
	                async: true,
	                cache: true,
	                url: name
	            });
	
	            request.success(function (response) {
	
	                dfd.resolve(response);
	
	            });
	            request.error(function (errors) {
	
	                dfd.reject(errors);
	
	            });
	
	            return promise;
	
	        },
	
	        getTemplateFromCache = function (name) {
	
	            return templateCache[name];
	
	        },
	
	        cacheTemplate = function (name, template) {
	
	            templateCache[name] = template;
	
	            return;
	
	        },
	
	        getTemplate = function (name) {
	
	            var dfd = $.Deferred(),
	                promise = dfd.promise();
	
	            var template = getTemplateFromCache(name);
	
	            if (template != null) {
	
	                dfd.resolve(template);
	            }
	            else {
	                $.when(makeRequest(name))
	                    .then(function (template) {
	
	                        if (template != null) {
	
	                            cacheTemplate(name, template);
	
	                        }
	
	                        dfd.resolve(template);
	                    })
	            }
	
	            return promise;
	
	        };
	
	    provider.get = function (template) {
	
	        getTemplate(template);
	
	    };
	
	    champ.templates = champ.templates || {};
	
	    champ.templates.get = provider.get;
	
	})(champ || {}, jQuery);

}).call(this, jQuery);