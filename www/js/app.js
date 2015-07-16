(function () {
  "use strict";
  angular.module('dining', ['ionic', 'dining.controllers', 'ngCordova', 'dining.services', 'angular-jwt', 'ionic.utils', 'angular-lodash', 'angularMoment', 'dining.push', 'ion-autocomplete', 'internationalPhoneNumber'])
  .constant('angularMomentConfig', {
      timezone: 'America/New_York' 
  })
  .value('appData',  {
    token: window.localStorage.getItem("token"),
    apiUrl: "https://app.disneydining.io",
    platformVersion: "0.0.0"
  })
  .run(function($ionicPlatform, $location, $rootScope, $state, Token, DB, $cordovaPush, $cordovaSplashscreen, $cordovaNetwork, $cordovaAppVersion, User, Push, Preferences, Restaurants, appData, jwtHelper) {
    //appData.apiUrl = "http://128.194.89.128:3001";
    //appData.apiUrl = "http://192.168.1.90:3001";
    appData.db = DB;
    appData.network = true;
    appData.user = null;
    appData.pref = null;
    appData.forceRefresh = [];
    appData.forceSync = [];
    appData.notificationInterval = null;
    appData.appVersion = "0.0.0";
    if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
      $ionicPlatform.ready(function() {
        appData.platformVersion = ionic.Platform.version();
        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) { 
          $cordovaSplashscreen.show();
        }

        if(ionic.Platform.isIOS()) {
          window.plugin.notification.local.promptForPermission();
        }

        $cordovaAppVersion.getAppVersion().then(function (version) {
          appData.appVersion = version;
        });
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
          // org.apache.cordova.statusbar required
          StatusBar.styleDefault();
        }
        if (navigator.connection) {
          appData.network = $cordovaNetwork.isOnline();
        }
        //console.log("Network State:", $cordovaNetwork.getNetwork());
        // listen for Online event
        $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
          appData.network = true;
          //console.log(appData.network);
        });
        
        $rootScope.$on('login', function(event){
          $state.transitionTo('app.login');
        });
        
        // listen for Offline event
        $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
          appData.network = false;
          //console.log(appData.network);
        });
        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          appData.pref = Preferences;
          appData.pref.init();
          /*
          appData.pref.set("lastNotification", JSON.stringify([{uid:"3tWkvm8Jt9fZow6AA7vHHg==", date:"1970-01-01T00:00:00Z"}])).then(
            function(result) {
              //console.log(result);
            },
            function(error) {
              console.log(error);
            }
          );
          */

          appData.pref.get("notificationInterval").then(
            function(result) {
              appData.notificationInterval = parseInt(result);
              //console.log(result);
            },
            function(error) {
              console.log(error);
              appData.pref.set("notificationInterval", 30).then(
                function(result) {
                  appData.notificationInterval = 30;
                  //console.log(result);
                },
                function(error) {
                  console.error(error);
                }
              );
            }
          );

          $rootScope.$on('$cordovaPush:notificationReceived', function (event, notification) {
            //console.log(notification);
            if (ionic.Platform.isAndroid()) {
              appData.pushService.handleAndroid(notification);
            } else if (ionic.Platform.isIOS()) {
              appData.pushService.handleIOS(notification);
            }
          });

        }
        // Notification Received

        appData.db.init().then(
          function(results) {
            appData.pushService = Push;
            if (appData.token && !jwtHelper.isTokenExpired(appData.token)) {
              appData.pushService.register();
              async.parallel(
                [
                  function(callback) {
                    User.refresh().then(
                      function(user) {
                        appData.user = user;
                        callback(null);
                      },
                      function(error) {
                        console.log(error);
                        callback(error);
                      }
                    );
                  },
                  function(callback) {
                    Restaurants.refresh().then(
                      function(success) {
                        console.log("Restaurants updated!");
                        callback(null);
                      },
                      function(error) {
                        console.log(error);
                        callback(error);
                      }
                    );
                  }
                ],
                function(error) {
                  $rootScope.$emit('db:ready');
                  $state.go('app.searches').then(
                    function() {
                      $rootScope.$emit('searches-refresh');
                    }
                  );
                }
              );
            } else {
              $state.transitionTo('app.login');
            }
          },
          function(error) {
            console.log(error);
            $state.transitionTo('app.login');
          }
        );
      });
    } else {
      appData.db.init().then(
        function(results) {
          appData.pushService = Push;
          if (appData.token) {
            appData.pushService.register();
            async.parallel(
              [
                function(callback) {
                  User.refresh().then(
                    function(user) {
                      appData.user = user;
                      callback(null);
                    }
                  );
                },
                function(callback) {
                  Restaurants.refresh().then(
                    function(success) {
                      console.log("Restaurants updated!");
                      callback(null);
                    },
                    function(error) {
                      console.error(error);
                    }
                  );
                }
              ],
              function(error) {
                $rootScope.$emit('db:ready');
                $state.go('app.searches').then(
                  function() {
                    $rootScope.$emit('searches-refresh');
                  }
                );
              }
            );
          } else {
            $state.transitionTo('app.login');
          }
        },
        function(error) {
          console.error(error);
        }
      );
    }
  })
  .config(function($stateProvider, $urlRouterProvider, jwtInterceptorProvider, $httpProvider) {
    $stateProvider
    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: 'AppCtrl',
      resolve: {
      }
    })
    .state('app.login', {
      url: "/login",
      views: {
        'menuContent': {
          templateUrl: "templates/login.html",
          controller: 'LoginCtrl'
        }
      }
    })
    .state('app.add', {
      url: "/add",
      views: {
        'menuContent': {
          templateUrl: "templates/search.html",
          controller: 'AddSearchCtrl'
        }
      },
      resolve: {
        user: function(User) {
          return User.get();
        }
      }
    })
    .state('app.searches', {
      url: "/searches",
      views: {
        'menuContent': {
          templateUrl: "templates/searches.html",
          controller: 'SearchlistsCtrl'
        }
      },
      resolve: {
        searches: function($stateParams, Searches) {
          return Searches.getAll();
        }
      }
    })
    .state('app.edit', {
      cache: false,
      url: "/searches/:id/edit",
      views: {
        'menuContent': {
          templateUrl: "templates/search.html",
          controller: 'EditSearchCtrl'
        }
      },
      resolve: {
        search: function($stateParams, Searches) {
          return Searches.get($stateParams.id);
        },
        restaurant: function($stateParams, Searches, Restaurants, $q) {
          var deferred = $q.defer();
          Searches.get($stateParams.id).then(
            function(search) {
              Restaurants.get(search.restaurant).then(
                function(value) {
                  return deferred.resolve(value);
                }
              );
            }
          );

          return deferred.promise;
        },
        secondary: function($stateParams, Searches, Restaurants, $q) {
          var deferred = $q.defer();
          Searches.get($stateParams.id).then(
            function(search) {
              if (search.secondary) {
                Restaurants.get(search.secondary).then(
                  function(value) {
                    return deferred.resolve(value);
                  }
                );
              } else {
                return deferred.resolve(null);
              }
            }
          );

          return deferred.promise;
        }
      }
    })
    .state('app.settings', {
      url: "/settings",
      views: {
        'menuContent': {
          templateUrl: "templates/settings.html",
          controller: 'SettingsCtrl'
        }
      },
      resolve: {
        user: function(User) {
          return User.get();
        }
      }
    })
    .state('app.about', {
      url: "/about",
      views: {
        'menuContent': {
          templateUrl: "templates/about.html",
          controller: 'AboutCtrl'
        }
      },
      resolve: {
        user: function(User) {
          return User.get();
        }
      }
    });

    jwtInterceptorProvider.tokenGetter = function(jwtHelper, $http, appData) {
      var token = window.localStorage.getItem("token"),
          now = moment.utc(),
          tokenExpires = (token) ? moment(jwtHelper.getTokenExpirationDate(token)).tz("UTC") : moment(),
          diff = tokenExpires.diff(now, "days");
      if (diff <= 10 && diff > 0) {
        return $http({
          url: appData.apiUrl+"/api/mobile/token/refresh/",
          // This makes it so that this request doesn't send the JWT
          skipAuthorization: true,
          method: 'POST',
          data: {
            token: token
          }
        }).then(
          function(response) {
            token = response.data.token;
            window.localStorage.setItem('token', token);
            return token;
          },
          function(error) {
            return null;
          }
        );
      } else {
        return token;
      }
    };

    $httpProvider.interceptors.push('jwtInterceptor');
  })

  .directive('standardTimeMeridian', function () {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
          etime: '=etime'
      },
      template: "<strong>{{stime}}</strong>",
      link: function (scope, elem, attrs) {
        function epochParser(val, opType) {
          if (val === null) {
            return "00:00";
          } else {
            var meridian = ['AM', 'PM'];

            if (opType === 'time') {
              var hours = parseInt(val / 3600);
              var minutes = (val / 60) % 60;
              var hoursRes = hours > 12 ? (hours - 12) : hours;

              var currentMeridian = meridian[parseInt(hours / 12)];

              return (prependZero(hoursRes) + ":" + prependZero(minutes) + " " + currentMeridian);
            }
          }
        }

        scope.stime = epochParser(scope.etime, 'time');

        function prependZero(param) {
          if (String(param).length < 2) {
            return "0" + String(param);
          }
          return param;
        }



        scope.$watch('etime', function (newValue, oldValue) {
            scope.stime = epochParser(scope.etime, 'time');
        });

      }
    };
  })
  .directive('standardTimeNoMeridian', function () {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
          etime: '=etime'
      },
      template: "<strong>{{stime}}</strong>",
      link: function (scope, elem, attrs) {
        function epochParser(val, opType) {
          if (val === null) {
              return "00:00";
          } else {
            if (opType === 'time') {
              var hours = parseInt(val / 3600);
              var minutes = (val / 60) % 60;

              return (prependZero(hours) + ":" + prependZero(minutes));
            }
          }
        }
        scope.stime = epochParser(scope.etime, 'time');

        function prependZero(param) {
          if (String(param).length < 2) {
            return "0" + String(param);
          }
          return param;
        }

        scope.$watch('etime', function (newValue, oldValue) {
          scope.stime = epochParser(scope.etime, 'time');
        });

      }
    };
  })

  .directive('ionicTimePicker', function ($ionicPopup) {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
        etime: '=etime',
        format: '=format',
        dateFormat: '=dateFormat',
        step: '=step'
      },
      link: function (scope, element, attrs) {
        element.on("click", function () {
          var obj = {epochTime: scope.etime, step: scope.step, format: scope.format};
          scope.time = { hours: 0, minutes: 0, meridian: "" };
          scope.dateFormat.format = scope.dateFormat.format || "X";
          var objDate = moment.utc(obj.epochTime, scope.dateFormat.format),
              updateHour = function() {
                if (obj.format === 12) {
                  scope.time.hours =  objDate.format("h");
                }
                if (obj.format === 24) {
                  scope.time.hours =  objDate.format("H");
                }
              };

          scope.increaseHours = function () {
            objDate.add(1, "hours");
            updateHour();
          };

          scope.decreaseHours = function () {
            objDate.subtract(1, "hours");
            updateHour();
          };

          scope.increaseMinutes = function () {
            objDate.add(obj.step, "minutes");
            var remainder = objDate.minute() % 5;
            objDate.subtract(remainder, "minutes");
            scope.time.minutes = objDate.format("mm");
            updateHour();
          };

          scope.decreaseMinutes = function () {
            objDate.subtract(obj.step, "minutes");
            var remainder = objDate.minute() % 5;
            objDate.subtract(remainder, "minutes");
            scope.time.minutes = objDate.format("mm");
            updateHour();
          };

          if (obj.format === 12) {

            scope.time.meridian = objDate.format("A");
            scope.time.hours = objDate.format("h");
            scope.time.minutes = objDate.format("mm");

            /*
            if (scope.time.hours == 0 && scope.time.meridian == "AM") {
              scope.time.hours = 12;
            }
            */

            scope.changeMeridian = function () {
              scope.time.meridian = (scope.time.meridian === "AM") ? "PM" : "AM";
            };

            $ionicPopup.show({
              template: '<div class=\"12HourTimePickerChildDiv\">\n    <div class=\"row\">\n            <span class=\"button-small col-25\">\n                <button class=\"button button-clear button-small button-dark timePickerArrows marginBottom10\"\n                        ng-click=\"increaseHours()\">\n                    <i class=\"icon ion-chevron-up\"><\/i><\/button>\n                <input type=\"text\" placeholder=\"\" ng-model=\"time.hours\" class=\"ipBoxes timePickerBoxText\" disabled>\n                <button class=\"button button-clear button-small button-dark timePickerArrows marginTop10\"\n                        ng-click=\"decreaseHours()\">\n                    <i class=\"icon ion-chevron-down\"><\/i><\/button>\n            <\/span>\n        <label class=\"col-10 timePickerColon\"> : <\/label>\n        <span class=\"button-small col-25\">\n            <button class=\"button button-clear button-small button-dark timePickerArrows marginBottom10\"\n                    ng-click=\"increaseMinutes()\"><i class=\"icon ion-chevron-up\"><\/i><\/button>\n            <input type=\"text\" placeholder=\"\" ng-model=\"time.minutes\" class=\"ipBoxes timePickerBoxText\" disabled>\n            <button class=\"button button-clear button-small button-dark timePickerArrows marginTop10\"\n                    ng-click=\"decreaseMinutes()\"><i class=\"icon ion-chevron-down\"><\/i><\/button>\n        <\/span>\n        <label class=\"col-10 timePickerColon\"> : <\/label>\n        <span class=\"button-small col-25\">\n            <button class=\"button button-clear button-small button-dark timePickerArrows marginBottom10\"\n                    ng-click=\"changeMeridian()\"><i class=\"icon ion-chevron-up\"><\/i><\/button>\n            <input type=\"text\" placeholder=\"\" ng-model=\"time.meridian\" class=\"ipBoxes timePickerBoxText\" disabled>\n            <button class=\"button button-clear button-small button-dark timePickerArrows marginTop10\"\n                    ng-click=\"changeMeridian()\"><i class=\"icon ion-chevron-down\"><\/i><\/button>\n        <\/span>\n    <\/div>\n<\/div>',
              title: '<strong>12-Hour Format</strong>',
              subTitle: '',
              scope: scope,
              buttons: [
                { text: 'Cancel' },
                {
                  text: 'Set',
                  type: 'button-positive',
                  onTap: function (e) {
                    scope.loadingContent = true;
                    scope.etime = objDate.format(scope.dateFormat.format);
                  }
                }
              ]
            });

          }

          if (obj.format === 24) {
            scope.time.hours = (objDate.getUTCHours());
            scope.time.minutes = (objDate.getUTCMinutes());
            $ionicPopup.show({
              templateUrl: '../templates/time-picker-24-hour.html',
              title: '<strong>24-Hour Format</strong>',
              subTitle: '',
              scope: scope,
              buttons: [
                { text: 'Cancel' },
                {
                  text: 'Set',
                  type: 'button-positive',
                  onTap: function (e) {
                    scope.loadingContent = true;
                    var totalSec = 0;

                    if (scope.time.hours !== 24) {
                      totalSec = (scope.time.hours * 60 * 60) + (scope.time.minutes * 60);
                    } else {
                      totalSec = scope.time.minutes * 60;
                    }
                    scope.etime = totalSec;
                  }
                }
              ]
            });
          }
        });
      }
    };
  })
  .directive('mdButton', [function(){
    return {
      replace: true,
      restricte: 'E',
      transclude: true,
      template: '<button class="btn btn-link md-button" ng-transclude></button>'
    };
  }]);
}());
