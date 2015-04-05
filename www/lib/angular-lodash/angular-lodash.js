(function (ng, _) {
  'use strict';

  var
    lodashModule = ng.module('angular-lodash', []),
    utilsModule = ng.module('angular-lodash/utils', []),
    filtersModule = ng.module('angular-lodash/filters', []);

  // begin custom _

  function propGetterFactory(prop) {
    return function(obj) {return obj[prop];};
  }

  _._ = _;

  // Shiv "min", "max" ,"sortedIndex" to accept property predicate.
  _.each(['min', 'max', 'sortedIndex'], function(fnName) {
    _[fnName] = _.wrap(_[fnName], function(fn) {
      var args = _.toArray(arguments).slice(1);

      if(_.isString(args[2])) {
        // for "sortedIndex", transmuting str to property getter
        args[2] = propGetterFactory(args[2]);
      }
      else if(_.isString(args[1])) {
        // for "min" or "max", transmuting str to property getter
        args[1] = propGetterFactory(args[1]);
      }

      return fn.apply(_, args);
    });
  });

  // Shiv "filter", "reject" to angular's built-in,
  // and reserve lodash's feature(works on obj).
  ng.injector(['ng']).invoke(['$filter', function($filter) {
    _.filter = _.select = _.wrap($filter('filter'), function(filter, obj, exp) {
      if(!(_.isArray(obj))) {
        obj = _.toArray(obj);
      }

      return filter(obj, exp);
    });

    _.reject = function(obj, exp) {
      // use angular built-in negated predicate
      if(_.isString(exp)) {
        return _.filter(obj, '!' + exp);
      }

      var diff = _.bind(_.difference, _, obj);

      return diff(_.filter(obj, exp));
    };
  }]);

  // end custom _


  // begin register angular-lodash/utils

  _.each(_.methods(_), function(methodName) {
    function register($rootScope) {$rootScope[methodName] = _.bind(_[methodName], _);}

    _.each([
      lodashModule,
      utilsModule,
      ng.module('angular-lodash/utils/' + methodName, [])
      ], function(module) {
        module.run(['$rootScope', register]);
    });
  });

  // end register angular-lodash/utils


  // begin register angular-lodash/filters

  var adapList = [
      // Arrays
      'chunk',
      'compact',
      'difference',
      ['rest', 'tail', 'drop'],
      'dropRight',
      'dropRightWhile',
      'dropWhile',
      'fill',
      'findIndex',
      'findLastIndex',
      ['first', 'head', 'take'],
      'flatten',
      'flattenDeep',
      'indexOf',
      'initial',
      'intersection',
      'last',
      'lastIndexOf',
      'pull',
      'pullAt',
      'remove',
      'slice',
      'sortedIndex',
      'takeRight',
      'takeRightWhile',
      'takeWhile',
      'union',
      ['uniq', 'unique'],
      'unzip',
      'without',
      'xor',
      'zip',
      ['zipObject', 'object'],

      // Collections
      'at',
      'countBy',
      ['every', 'all'],
      ['filter', 'select'],
      ['find', 'detect'],
      'findLast',
      'findWhere',
      ['forEachRight', 'eachRight'],
      'groupBy',
      ['includes', 'include'],
      'indexBy',
      'invoke',
      ['map', 'collect'],
      'partition',
      'pluck',
      ['reduce', 'inject', 'foldl'],
      ['reduceRight', 'foldr'],
      'reject',
      'sample',
      'shuffle',
      'size',
      ['some', 'any'],
      'sortBy',
      'sortByOrder',
      'where',

      // Math
      'max',
      'min',

      // Number
      'inRange',
      'random',

      // Objects
      'findKey',
      'findLastKey',
      ['functions', 'methods'],
      'has', 
      'keys',
      'identity',
      'invert',
      'omit',
      'pairs',
      'pick',
      'result',
      'tap',
      'toArray',
      'uniqueId',
      'values',
      'valuesIn',

      // String
      'camelCase',
      'capitalize',
      'deburr',
      'endsWith',
      'escape',
      'escapeRegExp',
      'kebabCase',
      'pad',
      'padLeft',
      'padRight',
      'parseInt',
      'repeat',
      'snakeCase',
      'startCase',
      'startsWith',
      'template',
      'trim',
      'trimLeft',
      'trimRight',
      'trunc',
      'unescape',
      'words'
    ];

  _.each(adapList, function(filterNames) {
    if(!(_.isArray(filterNames))) {
      filterNames = [filterNames];
    }

    var
      filter = _.bind(_[filterNames[0]], _),
      filterFactory = function() {return filter;};

    _.each(filterNames, function(filterName) {
      _.each([
        lodashModule,
        filtersModule,
        ng.module('angular-lodash/filters/' + filterName, [])
        ], function(module) {
          module.filter(filterName, filterFactory);
      });
    });
  });

  // end register angular-lodash/filters

}(angular, _));
