# An AngularJS module adapting lodash

A fork of [angular-underscore](https://github.com/cabrel/angular-lodash) upgrading to Lodash `v3.5`.

This module exposes lodash's API into angular app's root scope,
and provides some filters from lodash.


## How to use

### Install

After loading angular.js and lodash.js:

```html
<script type="text/javascript" src="angular-lodash.js"></script>
```

### Load angular-lodash

#### Load the whole library

```javascript
angular.module('app', ['angular-lodash']);
```

### Usecase

#### uniq

```html
<script type="text/javascript">
  angular.module('example', ['angular-lodash']);
  app.controller('MainCtrl', function($scope) {});
</script>

<body ng-app="example">
  <div ng-controller="MainCtrl">
    <!-- output unique numbers from input.. [1, 2, 3, 4, 5, 6, 7, 8] -->
    <div ng-repeat="num in [1,1,2,3,4,5,5,6,6,7,7,7,8]|uniq">{{num}}</div>
  </div>
</body>
```

#### pluck

```
<script type="text/javascript">
  angular.module('example', ['angular-lodash']);
  app.controller('MainCtrl', function($scope) {
      $scope.exarr = [
        { 'name': 'John', 'age': 26 },
        { 'name': 'Bob', 'age': 41 },
        { 'name': 'Tom', 'age': 32 },
        { 'name': 'Ralph', 'age': 17 },
        { 'name': 'Molly', 'age': 13 }
      ];
  });
</script>

<body ng-app="example">
  <div ng-controller="MainCtrl">
    <div ng-repeat="age in exarr|pluck:'age'">{{age}}</div>
  </div>
</body>
```

#### keys

```
<script type="text/javascript">
  angular.module('example', ['angular-lodash']);
  app.controller('MainCtrl', function($scope) {                                                                                                                                                        
    $scope.exobj = {
      'key1': {
        'subkey1': 1
      },
      'key2': {
        'subkey2': 2
      },
      'key3': {
        'subkey3': 3,
        'subkey31': 31
      }
    };
  }); 
</script>

<body ng-app="example">
  <div ng-controller="MainCtrl">
    <div ng-repeat="k in exobj|keys">{{k}}</div>
  </div>
</body>
```

## Changelog

2015-03-13    v0.2.0    Lodash version bump to `v3.5.x`
