/*
hinclude.js -- HTML Includes (version 0.9.5)

Copyright (c) 2005-2012 Mark Nottingham <mnot@mnot.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

------------------------------------------------------------------------------

See http://mnot.github.com/hinclude/ for documentation.
*/

/*jslint indent: 2, browser: true, vars: true, nomen: true */
/*global alert, ActiveXObject */

var hinclude;

(function () {

  "use strict";

  hinclude = {
    classprefix: "include_",
    dataIncludeSrc: "data-include-src",

    callbackRegistry: {},
    registerCallback: function(elementId, callback) {
      this.callbackRegistry[elementId] = callback;
    },

    set_content_async: function (element, req, data) {
      if (req.readyState === 4) {
        if (req.status === 200 || req.status === 304) {
          element.innerHTML = req.responseText;
          hinclude.runJs(element);
          if (typeof hinclude.callbackRegistry[element.id] === "function") {
            hinclude.callbackRegistry[element.id](element, req, data);
          }
        }
        element.className = hinclude.classprefix + req.status;
      }
    },

    buffer: [],
    set_content_buffered: function (element, req, data) {
      if (req.readyState === 4) {
        hinclude.buffer.push([element, req, data]);
        hinclude.outstanding -= 1;
        if (hinclude.outstanding === 0) {
          hinclude.show_buffered_content();
        }
      }
    },

    show_buffered_content: function () {
      while (hinclude.buffer.length > 0) {
        var include = hinclude.buffer.pop();
        if (include[1].status === 200 || include[1].status === 304) {
          include[0].innerHTML = include[1].responseText;
          hinclude.runJs(include[0]);
          if (typeof hinclude.callbackRegistry[include[0].id] === "function") {
            hinclude.callbackRegistry[include[0].id](include[0], include[1], include[2]);
          }
        }
        include[0].className = hinclude.classprefix + include[1].status;
      }
    },

    outstanding: 0,
    includes: [],
    run: function () {
      var i = 0;
      var mode = this.get_meta("include_mode", "buffered");
      
      var callback = function (element, req) {};
      if (mode === "async") {
        callback = this.set_content_async;
      } else if (mode === "buffered") {
        callback = this.set_content_buffered;
        var timeout = this.get_meta("include_timeout", 2.5) * 1000;
        setTimeout(hinclude.show_buffered_content, timeout);
      }
      
      var self = this;
      
      this.includes = this.getAllElementsWithAttribute(this.dataIncludeSrc);

      for (i; i < this.includes.length; i += 1) {
        this.include(this.includes[i], this.includes[i].getAttribute(this.dataIncludeSrc), this.includes[i].getAttribute("media"), callback);
      }
    },

    include: function (element, url, media, incl_cb) {
      var self = this;

      if (media && window.matchMedia && !window.matchMedia(media).matches) {
        return;
      }
      var scheme = url.substring(0, url.indexOf(":"));
      if (scheme.toLowerCase() === "data") { // just text/plain for now
        var data = decodeURIComponent(url.substring(url.indexOf(",") + 1, url.length));
        element.innerHTML = data;
      } else {
        var req = false;
        if (window.XMLHttpRequest) {
          try {
            req = new XMLHttpRequest();
          } catch (e1) {
            req = false;
          }
        } else if (window.ActiveXObject) {
          try {
            req = new ActiveXObject("Microsoft.XMLHTTP");
          } catch (e2) {
            req = false;
          }
        }

        var data = this.collectData(element);

        if (req) {
          this.outstanding += 1;
          req.onreadystatechange = function () {
            incl_cb.apply(self, [element, req, data]);
          };
          try {          
            req.open("GET", url);
            req.send();
          } catch (e3) {
            this.outstanding -= 1;
            alert("Include error: " + url + " (" + e3 + ")");
          }
        }
      }
    },

    runJs: function (element) {
      var scripts = element.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        eval(scripts[i].innerHTML);
      }
    },

    collectData: function(el)
    {
      var self = this;
      var data = [];
      [].forEach.call(el.attributes, function(attr) {
        if (/^data-/.test(attr.name) && attr.name != self.dataIncludeSrc) {
          data[attr.name.substr(5)] = encodeURIComponent(attr.value);
        }
      });

      return data;
    },

    /**
     * credits: http://stackoverflow.com/questions/9496427/can-i-get-elements-by-attribute-selector-when-queryselectorall-is-not-available
     */
    getAllElementsWithAttribute: function(attribute)
    {
      var matchingElements = [];
      var allElements = document.getElementsByTagName('*');
      for (var i = 0, n = allElements.length; i < n; i++)
      {
        if (allElements[i].getAttribute(attribute) != null)
        {
          // Element exists with attribute. Add to array.
          matchingElements.push(allElements[i]);
        }
      }
      return matchingElements;
    },

    refresh: function (element_id) {
      var i = 0;
      var mode = this.get_meta("include_mode", "buffered");
      var callback = function (element, req) {};
      callback = this.set_content_buffered;
      for (i; i < this.includes.length; i += 1) {
        if (this.includes[i].getAttribute("id") === element_id) {
          var data = this.collectData(this.includes[i]);
          this.include(this.includes[i], this.includes[i].getAttribute("src"), data, callback);
        }
      }
    },

    get_meta: function (name, value_default) {
      var m = 0;
      var metas = document.getElementsByTagName("meta");
      for (m; m < metas.length; m += 1) {
        var meta_name = metas[m].getAttribute("name");
        if (meta_name === name) {
          return metas[m].getAttribute("content");
        }
      }
      return value_default;
    },

    /*!
     * contentloaded.js
     *
     * Author: Diego Perini (diego.perini at gmail.com)
     * Summary: cross-browser wrapper for DOMContentLoaded
     * Updated: 20101020
     * License: MIT
     * Version: 1.2
     *
     * URL:
     * http://javascript.nwbox.com/ContentLoaded/
     * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
     *
     */
    // @win window reference
    // @fn function reference
    contentLoaded: function(win, fn) {

      var done = false, top = true,

      doc = win.document,
      root = doc.documentElement,
      modern = doc.addEventListener,

      add = modern ? 'addEventListener' : 'attachEvent',
      rem = modern ? 'removeEventListener' : 'detachEvent',
      pre = modern ? '' : 'on',

      init = function(e) {
        if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
        (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
        if (!done && (done = true)) fn.call(win, e.type || e);
      },

      poll = function() {
        try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
        init('poll');
      };

      if (doc.readyState == 'complete') fn.call(win, 'lazy');
      else {
        if (!modern && root.doScroll) {
          try { top = !win.frameElement; } catch(e) { }
          if (top) poll();
        }
        doc[add](pre + 'DOMContentLoaded', init, false);
        doc[add](pre + 'readystatechange', init, false);
        win[add](pre + 'load', init, false);
      }

    }
  };

  hinclude.contentLoaded(window, function () { hinclude.run(); });
}());

