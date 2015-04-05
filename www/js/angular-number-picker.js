/**
 *
 *  Defines `hNumberPicker` directive which can only be used as element.
 *
 *  It allows end-user to choose number, instead of typing
 *
 *  usage:
 *
 *       <h-number value="input.num" min="1" max="10" step="1"></h-number>
 *
 *  @author  Howard.Zuo
 *  @date    Aug 31th, 2014
 *
 */
(function(angular) {
  'use strict';

  var defaults = {
        min: 0,
        max: 100,
        step: 1,
        timeout: 600
      },

      assign = function(dest, src) {
        for (var key in src) {
          if (!dest[key]) {
             dest[key] = src[key];
          }
        }
        return dest;
      },

      isNumber = function(value) {
        var val = Number(value);
        return !isNaN(val) && val == value;
      },

      toNumber = function(value) {
        return Number(value);
      },

      checkNumber = function(value) {
        if (!isNumber(value)) {
          throw new Error('value [' + value + '] is not a valid number');
        }
      },

      getTarget = function(e) {
        if (e.touches && e.touches.length > 0) {
          return angular.element(e.touches[0]);
        }
        return angular.element(e);
      },

      getType = function(e) {
        return getTarget(e).attr('type');
      },

      transform = function(opts) {
        for (var key in opts) {
          var value = opts[key];
          opts[key] = toNumber(value);
        }
      },

      moduleName = 'angularNumberPicker',

      module = angular.module(moduleName, []),

      directive = function($timeout, $interval) {
        return {
          restrict: 'AE',
          scope: {
              'value': '=',
              'min': '@',
              'max': '@',
              'step': '@'
          },
          replace: true,
          link: function($scope, element) {

              var opts = assign({
                  min: $scope.min,
                  max: $scope.max,
                  step: $scope.step
              }, defaults);

              checkNumber(opts.min);
              checkNumber(opts.max);
              checkNumber(opts.step);

              transform(opts);

              $scope.value = $scope.value || opts.min;

              $scope.$watch('value', function(newValue) {
                  $scope.canDown = newValue > opts.min;
                  $scope.canUp = newValue < opts.max;
              });

              var changeNumber = function($event) {
                  var type = getType($event);
                  if ('up' === type) {
                      if ($scope.value >= opts.max) {
                          return;
                      }
                      $scope.value += opts.step;
                  } else if ('down' === type) {
                      if ($scope.value <= opts.min) {
                          return;
                      }
                      $scope.value -= opts.step;
                  }
              };

              var timeoutPro, intervalPro;
              var start, end;
              var addon = element.find('button');

              addon.on("tap", function () {
                changeNumber(this);
                $scope.$apply();
                //e.stopPropagation();
              });

              /*
              addon.on('touchstart', function(e) {
                  getTarget(this).addClass('active');
                  start = new Date().getTime();
                  timeoutPro = $timeout(function() {
                      intervalPro = $interval(function() {
                          changeNumber(this);
                      }, 200);
                  }, opts.timeout);
                  //e.preventDefault();
              });

              addon.on('touchend', function(e) {
                  end = new Date().getTime();
                  if (intervalPro) {
                      $interval.cancel(intervalPro);
                      intervalPro = undefined;
                  }
                  if (timeoutPro) {
                      $timeout.cancel(timeoutPro);
                      timeoutPro = undefined;
                  }
                  if ((end - start) < opts.timeout) {
                      changeNumber(this);
                      $scope.$apply();
                  }
                  getTarget(this).removeClass('active');
              });
              */

              $scope.$on('$destroy', function() {
                //addon.off('touchstart touchend click');
              });

            },
            template: '<div class="angular-number-picker"><button class="button button-light icon ion-minus-circled" type="down" ng-disabled="!canDown" ng-click="click()"></button><label>{{ value }}</label><button class="button button-light icon ion-plus-circled" type="up" ng-disabled="!canUp"></button></div>'
        };
      };
  module.directive('hNumber', ['$timeout', '$interval', directive]);



}(angular));
