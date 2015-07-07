/*global app */
(function () {
  "use strict";
  
  angular.module('dining.controllers', ['dining.services', 'ui.router', 'ionic', 'angular-md5', 'angularNumberPicker', 'toastr'])

  .controller('AppCtrl', function($scope, $cordovaSQLite, User, Restaurants, md5, $state, $rootScope, appData) {
    var thisScope = $scope,
        getUser = function() {
          User.get().then(
            function(data) {
              if (data) {
                appData.user = data;
                $scope.user = data;
                $scope.user.md5 = md5.createHash($scope.user.firstName || '');
                var identicon = document.getElementById("identicon");
                jdenticon.update(identicon, $scope.user.md5);
              }

            },
            function(error) {
              console.error(error);
            }
          );
        };
    $scope.data = {
      addButton: false
    };

    $rootScope.$on('db:ready', function (event, data) {
      getUser();
    });

    $scope.showAdd = function() {
      $state.transitionTo('app.add');
    };
    $scope.$on('addButton',
      function($event, display) {
        $scope.data.addButton = display;
      }
    );

    $rootScope.$on('$stateChangeStart',
      function(event, toState, toParams, fromState, fromParams){
        if (toState.name === "app.searches") {
          $scope.$emit('addButton', true);
        } else {
          $scope.$emit('addButton', false);
        }

      }
    );

    $rootScope.$on("push:user-update",
      function (event, data) {
        User.refresh().then(
          function(success) {
            getUser();
          },
          function(error) {
            console.error(error);
          }
        );
      }
    );

    $rootScope.$on("push:restaurant-update",
      function (event, data) {
        Restaurants.refresh().then(
          function(success) {
            console.log("Restaurants updated!");
          },
          function(error) {
            console.error(error);
          }
        );
      }
    );


    $rootScope.$on("user-update",
      function (event, data) {
        getUser();
      }
    );
  })

  .controller('LoginCtrl', function($scope, $timeout, $state, $ionicLoading, $ionicHistory, $ionicPopup, $cordovaSplashscreen, Login, Token, User, Searches, Restaurants, Logs, appData) {
    // Form data for the login modal
    $scope.loginData = {};

    var setToken = function(tokenRcvd) {
          Token.set(tokenRcvd);
          appData.token = tokenRcvd;
        },
        login = function(data) {
          var login = new Login();
          login = data;
          Login.save(login,
            function(d) {
              //console.log("data from server:", d);
              setToken(d.token);
              updateUser(d.user);
            },
            function(error) {
               var alertPopup = $ionicPopup.alert({
                 title: 'Login Issue',
                 template: error.data.message.response
               });
               $ionicLoading.hide();
               alertPopup.then(
                function(res) {
                  //console.log(res);
                }
               );
            }
          );
        },
        updateUser = function(user) {
          User.set(user).then(
            function(result) {
              //console.log(result);
              updateUserInfo(user);
            },
            function(error) {
              console.error(error);
            }
          );
        },
        updateSearch = function(search, callback) {
          Searches.set(search).then(
            function(result) {
              //console.log(result);
              callback();
            },
            function(error) {
              console.error(error);
              callback(error);
            }
          );
        },
        updateUserInfo = function(user) {
          async.each(user.searches, updateSearch, function(error){
            //if (error) console.log(error);
            Restaurants.refresh().then(
              function(result) {
                $ionicLoading.hide();
                $ionicHistory.nextViewOptions({
                  historyRoot: true
                });
                if (appData.token) {
                  appData.pushService.register();
                }
                $state.go(
                  "app.searches",
                  null,
                  {
                    location: 'replace'
                  }
                );
              },
              function(error) {
                console.error(error);
              }
            );

          });
        };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function() {
      $ionicLoading.show({
        template: 'Retrieving data...'
      });
      //console.log('Doing login', $scope.loginData);
      login($scope.loginData);
    };
    $cordovaSplashscreen.hide();
  })

  .controller('SearchlistsCtrl',
    function($scope, $rootScope, $state, $cordovaSplashscreen, $cordovaInAppBrowser, Token, Searches, searches, appData) {
      var getSearches = function() {
            console.log("Refreshing searches...");
            Searches.getAll().then(
              function(searches) {
                //console.log(searches);
                $scope.searches = searches;
                async.each(
                  searches,
                  function(search, callback){
                    if (appData.pushService.type === "web") {
                      appData.pushService.leaveRoom(search.uid);
                      appData.pushService.joinRoom(search.uid);
                    }
                    callback();
                  },
                  function(error){
                    //if (error) console.log(error);
                  }
                );
              },
              function(error) {
                //if (error) console.log(error);
              }
            );
          },
          refreshSearches = function() {
            Searches.refresh().then(
              function(searches) {
                //$scope.items = newItems;
                $scope.$broadcast('scroll.refreshComplete');
                getSearches();
              }
            );
          },
          refreshSearch = function(id) {
            Searches.refresh(id).then(
              function(searches) {
                //console.log("Refreshing searches");
                getSearches();
              },
              function(error){
                //if (error) console.log(error);
              }
            );
          },
          deleteSearch = function(search, remote) {
            remote = (remote === null) ? false : remote;
            Searches.delete(search.id, remote).then(
              function(success) {
                //console.log(success);
                getSearches();
              },
              function(error) {
                console.error(error);
              }
            );
          };
      if (appData.user) {
        $scope.data.addDisabled = (appData.user.availableSearches > 0) ? false : true;
      } else {
        $scope.data.addDisabled = true;
      }
      $scope.data.openBrowser = function(time) {
        var options = {
          location: 'yes',
          clearcache: 'yes',
          toolbar: 'no'
        };
        $cordovaInAppBrowser.open("https://disneyworld.disney.go.com/dining-reservation/book-dining-event/?offerId[]="+time.url, '_system', options)
        .then(function(event) {
          // success
        })
        .catch(function(event) {
          // error
        });


    $cordovaInAppBrowser.close();
      };

      $rootScope.$on("push:search-update", function (event, data) {
        Searches.getByUid(data).then(
          function(search) {
            Searches.refresh(search.id).then(
              function(searches) {
                //console.log("Refreshing searches");
                getSearches();
              },
              function(error){
                //if (error) console.log(error);
              }
            );
          },
          function(error){
            //if (error) console.log(error);
          }
        );
      });

      $rootScope.$on("push:search-edit", function (event, data) {
        refreshSearch(data.id);
      });

      $rootScope.$on("push:search-add", function (event, data) {
        refreshSearch(data.id);
      });

      $rootScope.$on("push:search-delete", function (event, data) {
        deleteSearch(data, false);
      });

      $rootScope.$on("search-refresh", function (event, data) {
        refreshSearch(data.id);
      });

      $rootScope.$on("searches-refresh", function (event, data) {
        refreshSearches();
      });

      $scope.doRefresh = function() {
        refreshSearches();
      };

      $scope.deleteSearch = function(search) {
        deleteSearch(search, true);
      };

      $scope.addSearch = function() {
        $state.transitionTo('app.add');
      };

      $scope.searchClick = function(search) {
        var test = this;
        $state.transitionTo('app.edit', search);
      };

      $scope.$parent.data.addButton = true;
      $scope.searches = searches;
      $rootScope.$emit('user-update');
      if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
        $cordovaSplashscreen.hide();
          appData.pref.get("updates").then(
            function(result) {
              console.log(result);
              var updates = JSON.parse(result);
              async.each(
                updates,
                function(update, callback) {
                  console.log(update);
                  if (update.type === "search-update") {
                    $rootScope.$emit('push:search-update', update.uid);
                  } else if (update.type === "search-edit") {
                    $rootScope.$emit('push:search-edit', update.id);
                  } else if (update.type === "search-add") {
                    $rootScope.$emit('push:search-add', update.id);
                  } else if (update.type === "user-update") {
                    $rootScope.$emit('push:user-update', update.id);
                  } else if (update.type === "search-delete") {
                    $rootScope.$emit('push:search-delete', update.id);
                  } else if (update.type === "restaurant-update") {
                    $rootScope.$emit('push:restaurant-update');
                  }
                  callback(null);
                },
                function(error) {
                  appData.pref.set("updates", "[]").then(
                    function(result) {
                      console.log(result);
                    },
                    function(error) {
                      console.error(error);
                    }
                  );
                }
              );
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

      }
    }
  )

  .controller('AddSearchCtrl', function($scope, $state, $rootScope, $cordovaDatePicker, $q, Restaurants, Searches, Toast, user, appData) {
    //$scope.$parent.addButton = false;
    $scope.data = {
      "restaurants": null,
      "search": '',
      "epochTime": moment.utc().add(1, "day").tz("America/New_York").format("h:mm A"),
      "day": moment.utc().add(1, "day").tz("America/New_York").format("dddd, MMMM DD YYYY"),
      "selected": null,
      "secondary": null,
      "seats": 2,
      "buttonName": "Add",
      "title": "Add Search",
      "error": false,
      "user": angular.copy(user)
    };

    $scope.search = function(query) {
      var deferred = $q.defer();
      Restaurants.find(query).then(
        function(matches) {
          
          return deferred.resolve(matches);
        },
        function(error) {
          console.error(error);
        }
      );
      return deferred.promise;
    };

    $scope.showDatePicker = function($event) {
      var options = {
        date: new Date(moment($scope.data.day, "dddd, MMMM DD YYYY")),
        mode: 'date', // or 'time'
        allowOldDates: false,
        allowFutureDates: true,
        maxDate: new Date(moment.utc().add(180, "days")),
        doneButtonLabel: 'DONE',
        doneButtonColor: '#F2F3F4',
        cancelButtonLabel: 'CANCEL',
        cancelButtonColor: '#000000'
      };

      $cordovaDatePicker.show(options).then(
        function(date){
            $scope.data.day = moment(date).format("dddd, MMMM DD YYYY");
        }
      );
    };

    $scope.onSubmit = function(item) {
      var search = {
            user: $scope.data.user.id
          },
          offset = moment($scope.data.day, "dddd, MMMM DD YYYY").tz("America/New_York").format("Z"),
          date = moment($scope.data.day + " " + $scope.data.epochTime + " " + offset, "dddd, MMMM DD YYYY h:mm A Z").tz("UTC");
      $scope.data.error = false;
      angular.extend(
        search,
        {
          enabled: true,
          deleted: false,
          restaurant: $scope.data.selected.id,
          secondary: ($scope.data.secondary) ? $scope.data.secondary.id : null,
          date: date.format("YYYY-MM-DD HH:mm:ssZ"),
          partySize: $scope.data.partySize,
          updatedAt: moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS")
        }
      );
      if ($scope.data.selected) {
        Searches.set(search, true).then(
          function(result) {
            //console.log(result);
            $rootScope.$emit('search-add', {id: search.id});
            Toast.show('Search has been added', 'short', 'top').then(
              function(success) {
                //console.log(success);
                $state.transitionTo('app.searches');
              },
              function (error) {
                console.error(error);
              }
            );
          },
          function(error) {
            console.error(error);
          }
        );
      } else {
        $scope.data.error = true;
      }
    };

  })

  .controller('SettingsCtrl', function($scope, $state, $q, $rootScope, User, Toast, user, appData) {
    $scope.data = {
      user: angular.copy(user),
      frequency: {
        email: user.emailTimeout / 60,
        emailDisplay: ((user.emailTimeout / 60) / 60),
        text: user.smsTimeout / 60,
        textDisplay: ((user.smsTimeout / 60) / 60),
        notificationInt: 30,
        notificationDisplay: "0.5"
      }
    };
    $scope.data.user.sendEmail = JSON.parse($scope.data.user.sendEmail);
    $scope.data.user.sendTxt = JSON.parse($scope.data.user.sendTxt);
    if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
      appData.pref.get("notificationInterval").then(
        function(result) {
          //console.log(result);
          $scope.data.frequency.notificationInt = result;
          $scope.data.frequency.notificationDisplay = (result / 60);
        },
        function(error) {
          console.error(error);
        }
      );
    } else {
      $scope.data.frequency.notificationInt = 30;
      $scope.data.frequency.notificationDisplay = (30 / 60);
    }

    $scope.$watch('data.frequency.email',function(val,old){
      $scope.data.frequency.emailDisplay = (val / 60);
    });
    $scope.$watch('data.frequency.text',function(val,old){
      $scope.data.frequency.textDisplay = (val / 60);
    });
    $scope.$watch('data.frequency.notificationInt',function(val,old){
      $scope.data.frequency.notificationDisplay = (val / 60);
    });
    $scope.updateProfile = function() {
      var user = angular.copy($scope.data.user);
      user.sendEmail = JSON.parse(user.sendEmail);
      user.sendTxt = JSON.parse(user.sendTxt);
      user.admin = JSON.parse(user.admin);
      user.activated = JSON.parse(user.activated);
      user.updatedAt = moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS");
      User.set(user).then(
        function(result) {
          //console.log(result);
          $rootScope.$emit('user-update');
          Toast.show('User profile has been updated', 'short', 'top').then(
            function(success) {
              //console.log(success);
            },
            function (error) {
              console.error(error);
            }
          );
        },
        function(error) {
          console.error(error);
        }
      );

    };
    $scope.updateNotifications = function() {
      var user = angular.copy($scope.data.user);
      user.emailTimeout = $scope.data.frequency.email * 60;
      user.smsTimeout = $scope.data.frequency.text * 60;
      user.updatedAt = moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS");
      user.sendEmail = JSON.parse(user.sendEmail);
      user.sendTxt = JSON.parse(user.sendTxt);
      user.admin = JSON.parse(user.admin);
      user.activated = JSON.parse(user.activated);
      User.set(user).then(
        function(result) {
          //console.log(result);
          $rootScope.$emit('user-update');
          Toast.show('Notification settings have been updated', 'short', 'top').then(
            function(success) {
              //console.log(success);
            },
            function (error) {
              console.error(error);
            }
          );
        },
        function(error) {
          console.error(error);
        }
      );

      appData.pref.set("notificationInterval", parseInt($scope.data.frequency.notificationInt, 10)).then(
        function(result) {
          //console.log(result);
        },
        function(error) {
          console.error(error);
        }
      );
    };
  })

  .controller('EditSearchCtrl', function($scope, $state, $q, $rootScope, $cordovaDatePicker, User, Toast, search, Restaurants, Searches, restaurant, secondary, appData) {
    $scope.data = {
      "restaurants": null,
      "search": restaurant[0].name,
      "epochTime": moment.utc(search.date).tz("America/New_York").format("h:mm A"),
      "day": moment.utc(search.date).tz("America/New_York").format("dddd, MMMM DD YYYY"),
      "selected": restaurant[0],
      "secondary": (secondary) ? secondary[0] : secondary,
      "selectedSearch": search,
      "partySize": search.partySize,
      "buttonName": "Update",
      "title": "Update Search",
      "clickedSecondary": function(callback) {
        $scope.data.secondary = callback.item;
      }
    };

    $scope.search = function(query) {
      var deferred = $q.defer();
      Restaurants.find(query).then(
        function(matches) {
          
          return deferred.resolve(matches);
        },
        function(error) {
          console.error(error);
        }
      );
      return deferred.promise;
    };

    $scope.clickedMethod = function(callback) {
      $scope.data.selected = callback.item;
      if (callback.item.secondary) {
        $scope.data.secondary = {
          id: null,
          name: null,
          secondary: null
        };
      } else {
        $scope.data.secondary = null;
      }
    };

    $scope.showDatePicker = function($event) {
      var options = {
        date: new Date(moment($scope.data.day, "dddd, MMMM DD YYYY")),
        mode: 'date', // or 'time'
        allowOldDates: false,
        allowFutureDates: true,
        maxDate: new Date(moment.utc().add(180, "days")),
        doneButtonLabel: 'DONE',
        doneButtonColor: '#F2F3F4',
        cancelButtonLabel: 'CANCEL',
        cancelButtonColor: '#000000'
      };

      $cordovaDatePicker.show(options).then(
        function(date){
          $scope.data.day = moment(date).tz("America/New_York").format("dddd, MMMM DD YYYY");
        }
      );
    };


    $scope.onSubmit = function(item) {
      var _search = angular.copy(search),
          offset = moment($scope.data.day, "dddd, MMMM DD YYYY").tz("America/New_York").format("Z"),
          date = moment($scope.data.day + " " + $scope.data.epochTime + " "+offset, "dddd, MMMM DD YYYY h:mm A Z").tz("UTC");
      angular.extend(
        _search,
        {
          enabled: JSON.parse(search.enabled),
          deleted: JSON.parse(search.deleted),
          restaurant: $scope.data.selected.id,
          secondary: ($scope.data.secondary) ? $scope.data.secondary.id : null,
          date: date.format("YYYY-MM-DD HH:mm:ssZ"),
          partySize: $scope.data.partySize,
          updatedAt: moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS")
        }
      );
      Searches.set(_search, true).then(
        function(result) {
          //console.log(result);
          $rootScope.$emit('search-refresh', {id: _search.id});
          Toast.show('Search has been updated', 'short', 'top').then(
            function(success) {
              //console.log(success);
              $state.transitionTo('app.searches');
            },
            function (error) {
              console.error(error);
            }
          );
        },
        function(error) {
          console.error(error);
        }
      );
    };

  })
  
  .controller('AboutCtrl', function($scope, User, appData) {
    $scope.data = {
      "version": appData.appVersion
    };
  });
}());
