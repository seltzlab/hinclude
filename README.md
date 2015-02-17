# hinclude.js

This is a fork of http://mnot.github.com/hinclude/

To use it include hinclude.js in your head section, no need to declare any external namespace.


```html
<div data-include-src="http://path/to/your/file.html"></div>
```


You can pass parameters to the included file

```html
<div id="include-myfile" data-include-src="http://path/to/your/file.html" data-foo="bar"></div>
```

Parameters will be available in your included file if you define a callback

```javascript
// in the included file
hinclude.registerCallback("include-myfile", function(element, request, data) {
  // do something dynamically interesting in your included file
  console.log(data.foo);
});
```
