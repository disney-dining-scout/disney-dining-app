angular.module('autocomplete.directive', [])

.directive('ionicAutocomplete',
  function ($ionicPopover) {
    var popoverTemplate =
     '<ion-popover-view style="margin-top:5px">' +
       '<ion-content>' +
         '<div class="list">' +
            '<a href="#" class="item" ng-repeat="item in items | filter:inputSearch" ng-click="selectItem(item)">{{item.name}}</a>' +
         '</div>' +
       '</ion-content>' +
     '</ion-popover-view>';
    return {
      restrict: 'A',
      scope: {
          params: '=ionicAutocomplete',
          inputSearch: '=ngModel'
      },
      link: function ($scope, $element, $attrs) {
        var popoverShown = false,
            popover = null;
        $scope.items = [];
        $element.on('keyup', function(e) {
          $scope.params.onChange(this.value).then(
            function(results) {
              $scope.items = results;
              if (!popoverShown) {
                popover.show(e);
              }
            }
          );
        });
        //Add autocorrect="off" so the 'change' event is detected when user tap the keyboard
        $element.attr('autocorrect', 'off');

        popover = $ionicPopover.fromTemplate(popoverTemplate, {
          scope: $scope
        });

        $scope.selectItem = function (item) {
          $element.val(item.name);
          popover.hide();
          $scope.params.onSelect(item);
        };

        $scope.$on('$destroy', function() {
          $element.off('keyup');
        });
      }
    };
  }
);
