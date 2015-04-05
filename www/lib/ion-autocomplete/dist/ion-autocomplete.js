(function() {

'use strict';

angular.module('ion-autocomplete', []).directive('ionAutocomplete', [
    '$ionicTemplateLoader', '$ionicBackdrop', '$rootScope', '$document', '$q', '$parse',
    function ($ionicTemplateLoader, $ionicBackdrop, $rootScope, $document, $q, $parse) {
        return {
            require: '?ngModel',
            restrict: 'E',
            template: '<input type="text" readonly="readonly" class="ion-autocomplete" autocomplete="off">',
            replace: true,
            scope: {
                itemsMethod: '&',
                itemsMethodValueKey: '@',
                itemValueKey: '@',
                itemViewValueKey: '@'
            },
            link: function (scope, element, attrs, ngModel) {

                // do nothing if the model is not set
                if (!ngModel) return;

                // set placeholder on element
                var placeholder = '';
                if (attrs.placeholder) {
                    placeholder = attrs.placeholder;
                    element.attr('placeholder', attrs.placeholder);
                }

                // set cancel button label
                var cancelLabel = 'Cancel';
                if (attrs.cancelLabel) {
                    cancelLabel = attrs.cancelLabel;
                }

                // the items of the list
                scope.items = [];
                scope.searchQuery = '';

                // returns the value of an item
                scope.getItemValue = function (item, key) {
                    var itemValue;
                    if (key && angular.isObject(item)) {
                        itemValue = $parse(key)(item);
                    } else {
                        itemValue = item;
                    }
                    return itemValue;
                };

                // the search container template
                var searchContainerTemplate = [
                    '<div class="ion-autocomplete-container">',
                    '<div class="bar bar-header item-input-inset">',
                    '<label class="item-input-wrapper">',
                    '<i class="icon ion-ios7-search placeholder-icon"></i>',
                    '<input type="search" class="ion-autocomplete-search" ng-model="searchQuery" placeholder="' + placeholder + '"/>',
                    '</label>',
                    '<button class="ion-autocomplete-cancel button button-clear">',
                    cancelLabel,
                    '</button>',
                    '</div>',
                    '<ion-content class="has-header has-header">',
                    '<ion-list>',
                    '<ion-item ng-repeat="item in items" type="item-text-wrap" ng-click="selectItem(item)">',
                    '{{getItemValue(item, itemViewValueKey)}}',
                    '</ion-item>',
                    '</ion-list>',
                    '</ion-content>',
                    '</div>'
                ].join('');

                // compile the popup template
                $ionicTemplateLoader.compile({
                    template: searchContainerTemplate,
                    scope: scope,
                    appendTo: $document[0].body
                }).then(function (compiledTemplate) {

                    // get the compiled search field
                    var searchInputElement = angular.element(compiledTemplate.element.find('input'));

                    // function which selects the item, hides the search container and the ionic backdrop
                    compiledTemplate.scope.selectItem = function (item) {

                        // clear the items and the search query
                        compiledTemplate.scope.items = [];
                        compiledTemplate.scope.searchQuery = '';

                        // set the view value and render it
                        ngModel.$setViewValue(item);
                        ngModel.$render();

                        // hide the container and the ionic backdrop
                        compiledTemplate.element.css('display', 'none');
                        $ionicBackdrop.release();
                    };

                    // watcher on the search field model to update the list according to the input
                    compiledTemplate.scope.$watch('searchQuery', function (query) {

                        // if the search query is empty, clear the items
                        if(query == '') {
                            compiledTemplate.scope.items = [];
                        }

                        if (query && angular.isFunction(compiledTemplate.scope.itemsMethod)) {

                            // convert the given function to a $q promise to support promises too
                            var promise = $q.when(compiledTemplate.scope.itemsMethod({query: query}));

                            promise.then(function (promiseData) {
                                // set the items which are returned by the items method
                                compiledTemplate.scope.items = compiledTemplate.scope.getItemValue(promiseData,
                                    compiledTemplate.scope.itemsMethodValueKey);
                            }, function (error) {
                                // reject the error because we do not handle the error here
                                return $q.reject(error);
                            });
                        }
                    });

                    // click handler on the input field which
                    var onClick = function (event) {

                        // prevent the default event and the propagation
                        event.preventDefault();
                        event.stopPropagation();

                        // show the ionic backdrop and the search container
                        $ionicBackdrop.retain();
                        compiledTemplate.element.css('display', 'block');

                        // focus on the search input field
                        searchInputElement[0].focus();
                        setTimeout(function () {
                            searchInputElement[0].focus();
                        }, 0);
                    };

                    // bind the onClick handler to the click and touchend events
                    element.bind('click', onClick);
                    element.bind('touchend', onClick);

                    // cancel handler for the cancel button which clears the search input field model and hides the
                    // search container and the ionic backdrop
                    compiledTemplate.element.find('button').bind('click', function (event) {
                        compiledTemplate.scope.searchQuery = '';
                        $ionicBackdrop.release();
                        compiledTemplate.element.css('display', 'none');
                    });

                });

                // render the view value of the model
                ngModel.$render = function () {
                    var elementValue = scope.getItemValue(ngModel.$viewValue, scope.itemViewValueKey);
                    element.val(elementValue)
                };

                // set the view value of the model
                ngModel.$formatters.push(function (modelValue) {
                    return scope.getItemValue(modelValue, scope.itemViewValueKey);
                });

                // set the model value of the model
                ngModel.$parsers.push(function (viewValue) {
                    return scope.getItemValue(viewValue, scope.itemValueKey)
                });

            }
        };
    }
]);
})();