/*global app */
(function (_) {
  "use strict";
  
  angular.module('ionic.utils', [])

  .factory('$localstorage', ['$window', function($window) {
    return {
      set: function(key, value) {
        $window.localStorage[key] = value;
      },
      get: function(key, defaultValue) {
        return $window.localStorage[key] || defaultValue;
      },
      setObject: function(key, value) {
        $window.localStorage[key] = JSON.stringify(value);
      },
      getObject: function(key) {
        return JSON.parse($window.localStorage[key] || '{}');
      }
    };
  }]);

  angular.module('dining.services', ['dining.config', 'ngResource', 'ngCordova', 'ionic.utils', 'toastr', 'angular-lodash'])
  // DB wrapper
  .factory('DB', function($q, DB_CONFIG, $cordovaSQLite) {
      var self = this;
      self.dbType = "sqlite";
      self.db = null;

      self.init = function() {
        var query,
            deferred = $q.defer(),
            result,
            initDb = function() {
              if (self.dbType === "websql") {
                async.each(
                  DB_CONFIG.tables,
                  function(table, callback) {
                    var columns = [],
                        populate = function() {
                          query = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + columns.join(',') + ')';
                          self.query(query).then(
                            function(result) {
                              //console.log('Table ' + table.name + ' initialized: ', result);
                              async.each(
                                table.data,
                                function(data, cb) {
                                  var q = 'INSERT OR IGNORE INTO ' + table.name + ' VALUES (',
                                      values = [];
                                  async.each(
                                    data,
                                    function(value, cback) {
                                      values.push("?");
                                      cback();
                                    },
                                    function(error) {
                                      q += values.join(',') + ')';
                                      self.query(q, data).then(
                                        function(result) {
                                          //console.log('Table ' + table.name + ' prepopulated: ', result);
                                          cb();
                                        }, function(reason) {
                                          //console.log('Failed: ' + reason);
                                          cb(reason);
                                        }
                                      );
                                    }
                                  );

                                },
                                function(error) {
                                  callback(error);
                                }
                              );
                            },
                            function(error) {
                              callback(error);
                            }
                          );
                        };
                    async.each(
                      table.columns,
                      function(column, cback) {
                        columns.push(column.name + ' ' + column.type);
                        cback();
                      },
                      function(error) {
                        populate();
                      }
                    );
                  },
                  function(error) {
                    if (error) {
                      deferred.reject(error);
                    } else {
                      deferred.resolve({success: true});
                    }
                  }
                );
              } else {
                deferred.resolve({success: true});
              }
            };

        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS() || ionic.Platform.isWindowsPhone()) {
          var dbName = "disneydining.db";

          window.plugins.sqlDB.copy(
            dbName,
            function (e) {
              // copy success, if not yet been copied
              // set "db" as the database
              //console.log("Database successfully copied: ", e);
              self.db = $cordovaSQLite.openDB(dbName);
              initDb();
            },
            function(error) {
              // copy error, if it has already been copied
              // set "db" as the database
              //console.log("There was an error copying the database: " + error);
              self.db = $cordovaSQLite.openDB(dbName);
              initDb();
            }
          );

        } else {
          self.dbType = "websql";
          self.db = window.openDatabase("disneydining.db", "1.0", "Disney Dining DB", 1000000);
          initDb();
        }

        return deferred.promise;
      };

      self.query = function(query, bindings) {
          bindings = typeof bindings !== 'undefined' ? bindings : [];
          var deferred = $q.defer();
          if (self.dbType === "websql") {
            self.db.transaction(function(transaction) {
              transaction.executeSql(query, bindings, function(transaction, result) {
                  deferred.resolve(result);
              }, function(transaction, error) {
                  deferred.reject(error);
              });
            });

            return deferred.promise;
          } else {
            $cordovaSQLite.execute(
              self.db,
              query,
              bindings
            ).then(
              function(result) {
                deferred.resolve(result);
              },
              function (error) {
                deferred.reject(error);
              }
            );

            return deferred.promise;
          }
      };

      self.insert = function(table, data) {
        var columns = [],
            values = [],
            questions = [],
            query,
            deferred = $q.defer();

        angular.forEach(data, function(value, key) {
          columns.push(key);
          values.push(value);
          questions.push("?");
        });

        query = 'INSERT INTO ' + table + ' (' + columns.join(',') + ')' + ' VALUES (' + questions.join(',') + ')';

        self.query(query, values).then(function(result) {
          deferred.resolve(result);
        }, function(error) {
          deferred.reject(error);
        });

        return deferred.promise;
      };

      self.update = function(table, where, data) {
        var columns = [],
            values = [],
            questions = [],
            query,
            deferred = $q.defer();

        angular.forEach(data, function(value, key) {
          columns.push(key);
          values.push(value);
          questions.push("?");
        });

        query = 'UPDATE ' + table + ' SET ' + columns.join('=?,') + '=?' + ' WHERE ' + where;

        self.query(query, values).then(function(result) {
          deferred.resolve(result);
        }, function(error) {
          deferred.reject(error);
        });

        return deferred.promise;
      };

      self.fetchAll = function(result) {
          var output = [];

          for (var i = 0; i < result.rows.length; i++) {
              output.push(result.rows.item(i));
          }

          return output;
      };

      self.fetch = function(result) {
        if (result.rows.length > 0) {
          return result.rows.item(0);
        } else {
          return null;
        }
      };

      self.truncate = function(table) {
        var query,
            deferred = $q.defer();

        query = 'DELETE FROM ' + table;

        self.query(query).then(function(result) {
          deferred.resolve(result);
        }, function(error) {
          deferred.reject(error);
        });

        return deferred.promise;
      };

      return self;
  })
  .factory('Token',
    function($q, $resource, $http, appData) {
      var self = this;

      self.get = function() {
        return window.localStorage.getItem("token");
      };

      self.refresh = function() {
        if (appData.network) {
          $http({
            url: '/api/mobile/token/refresh/',
            // This makes it so that this request doesn't send the JWT
            skipAuthorization: true,
            method: 'POST',
            data: {
              token: self.get()
            }
          }).then(function(response) {
            var token = response.data.token;
            self.set(token);
          });
        } else {
          appData.forceRefresh.push = "token";
        }
      };

      self.set = function(updatedToken) {
        window.localStorage.setItem("token", updatedToken);
        return updatedToken;
      };

      return self;
    }
  )
  .factory('User',
    function($resource, $q, $rootScope, appData) {
      var self = this;

      self.get = function() {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM user LIMIT 1").then(
          function(result){
            var user = appData.db.fetch(result);
            return deferred.resolve(user);
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.refresh = function() {
        var deferred = $q.defer();
        self.get().then(
          function(result) {
            var res = $resource(appData.apiUrl+'/api/user/:userId');
            if (appData.network) {
              res.query(
                {userId: result.id},
                function(data) {
                  self.set(data[0], false).then(
                    function(result) {
                      return deferred.resolve(data[0]);
                    },
                    function(error) {
                      if (error.status === 401) {
                        $rootScope.emit("login");
                      }
                      return deferred.reject(error);
                    }
                  );
                },
                function(error) {
                  return deferred.reject(error);
                }
              );
            } else {
              appData.forceRefresh.push = "user";
              return deferred.resolve(result);
            }
          },
          function(error) {
            return deferred.reject(error);
          }
        );
        return deferred.promise;
      };

      self.updateServer = function(user) {
        var deferred = $q.defer(),
            res = $resource(
                    appData.apiUrl+'/api/user/:userId',
                    {},
                    {
                      update: { method: 'PUT' }
                    }
                  );
        if (appData.network) {
          res.update(
            {userId: user.id},
            user,
            function(data) {
              return deferred.resolve(data);
            },
            function(error) {
              if (error.status === 401) {
                $rootScope.emit("login");
              }
              return deferred.reject(error);
            }
          );
        } else {
          appData.forceSync.push = "user";
          return deferred.resolve({success: true, deferred: true});
        }

        return deferred.promise;
      };

      self.set = function(user, remote) {
        remote = (remote === null) ? true : remote;
        var deferred = $q.defer();
        self.get().then(function(result) {
          var _user = angular.copy(user);
          delete _user.payments;
          delete _user.searches;
          delete _user.sms;
          if (result !== null && "id" in result) {
            appData.db.update("user", "id = " + _user.id, _user).then(
              function(data) {
                if (remote) {
                  self.updateServer(_user).then(
                    function(ret) {
                      return deferred.resolve(user);
                    },
                    function(error) {
                      return deferred.reject(error);
                    }
                  );
                } else {
                  return deferred.resolve(user);
                }
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          } else {
            appData.db.insert("user", _user).then(
              function(data) {
                self.updateServer(_user).then(
                  function(ret) {
                    return deferred.resolve(_user);
                  },
                  function(error) {
                    return deferred.reject(error);
                  }
                );
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          }
        });
        return deferred.promise;
      };

      return self;
    }
  )
  .factory('Logs',
    function($resource, $q, $rootScope, appData) {
      var self = this;

      self.get = function(uid) {
        uid = uid || null;
        if (uid !== null) {
          var deferred = $q.defer();
          appData.db.query("SELECT * FROM searchLogs WHERE uid = ? ORDER BY dateSearched DESC LIMIT 1", [uid]).then(
            function(result){
              var log = angular.copy(appData.db.fetch(result)),
                  times = (log !== null) ? JSON.parse(log.times) : null;
              if (log !== null) {
                log.times = times;
              }
              return deferred.resolve(log);
            },
            function(error) {
              return deferred.reject(error);
            }
          );

          return deferred.promise;
        } else {
          self.getAll();
        }
      };

      self.getById = function(id) {
        id = id || null;
        if (id !== null) {
          var deferred = $q.defer();
          appData.db.query("SELECT * FROM searchLogs WHERE id = ? ORDER BY dateSearched DESC LIMIT 1", [id]).then(
            function(result){
              var log = angular.copy(appData.db.fetch(result)),
                  times = (log !== null) ? JSON.parse(log.times) : null;
              if (log !== null) {
                log.times = times;
              }
              return deferred.resolve(log);
            },
            function(error) {
              return deferred.reject(error);
            }
          );

          return deferred.promise;
        } else {
          self.getAll();
        }
      };

      self.getAll = function(uid) {
        uid = uid || null;
        var deferred = $q.defer(),
            query = "SELECT * FROM searchLogs WHERE uid = ? ORDER BY dateSearched";
        appData.db.query(query, [uid]).then(
          function(result){
            return deferred.resolve(appData.db.fetchAll(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.purge = function(uid) {
        var deferred = $q.defer(),
            query = ""+
              "DELETE  " +
              "FROM searchLogs " +
              "WHERE id < ( " +
              "  select id " +
              "  from searchLogs " +
              "  WHERE uid = ? " +
              "  ORDER BY id DESC " +
              "  LIMIT 1 OFFSET 30 " +
              ") AND uid = ?";
        appData.db.query(query, [uid, uid]).then(
          function(result) {
            return deferred.resolve(result);
          },
          function(error) {
            return deferred.reject(error);
          }
        );
        return deferred.promise;
      };

      self.refresh = function(uid) {
        var deferred = $q.defer(),
            res = $resource(appData.apiUrl+'/api/search/'+uid);
        if (appData.network) {
          res.query({}, function(search) {
            var updateLogs = function(log, callback) {
                  self.set(log).then(
                    function(result) {
                      //console.log(result);
                      callback();
                    },
                    function(error) {
                      if (error.status === 401) {
                        $rootScope.emit("login");
                      }
                      console.error(error);
                      callback(error);
                    }
                  );
                };
            async.each(search.logs, updateLogs, function(error){
              //console.log(error)
              return deferred.resolve(search.logs);
            });

          });
        } else {
          appData.forceRefresh.push = "logs";
          self.getAll().then(
            function(logs) {
              return deferred.resolve(logs);
            },
            function(error) {
              return deferred.reject(error);
            }
          );
        }
        return deferred.promise;
      };

      self.set = function(log) {
        var deferred = $q.defer();
        self.getById(log.id).then(function(result) {
          log.times = JSON.stringify(log.times);
          if (result !== null && "id" in result) {
            appData.db.update("searchLogs", "id = " + log.id, log).then(
              function(data) {
                self.purge(log.uid);
                return deferred.resolve(result);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          } else {
            appData.db.insert("searchLogs", log).then(
              function(data) {
                self.purge(log.uid);
                return deferred.resolve(result);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          }
        });
        return deferred.promise;
      };

      return self;
    }
  )
  .factory('Searches',
    function($resource, $q, $rootScope, Logs, appData) {
      var self = this;

      self.get = function(id) {
        id = id || null;
        if (id !== null) {
          var deferred = $q.defer();
          appData.db.query("SELECT * FROM userSearches WHERE id = ?", [id]).then(
            function(result){
              var search = appData.db.fetch(result);
              if (search !== null) {
                Logs.get(search.uid).then(
                  function(logs){
                    var searchTime = moment.utc(search.date, "YYYY-MM-DDTHH:mm:ssZ"),
                        now = moment.utc(),
                        limit = moment.utc().add(180, "days");
                    search.past = searchTime.isBefore(now);
                    search.limit = searchTime.isAfter(limit);
                    search.logs = logs;
                    return deferred.resolve(search);
                  },
                  function(error) {
                    return deferred.reject(error);
                  }
                );
              } else {
                return deferred.resolve(search);
              }

            },
            function(error) {
              return deferred.reject(error);
            }
          );

          return deferred.promise;
        } else {
          self.getAll();
        }
      };

      self.getByUid = function(uid) {
        uid = uid || null;
        if (uid !== null) {
          var deferred = $q.defer();
          appData.db.query("SELECT * FROM userSearches WHERE uid = ?", [uid]).then(
            function(result){
              var search = appData.db.fetch(result);
              Logs.get(search.uid).then(
                function(logs){
                  var searchTime = moment.utc(search.date, "YYYY-MM-DDTHH:mm:ssZ"),
                          now = moment.utc(),
                          limit = moment.utc().add(180, "days");
                  search.past = searchTime.isBefore(now);
                  search.limit = searchTime.isAfter(limit);
                  search.logs = logs;
                  return deferred.resolve(search);
                },
                function(error) {
                  return deferred.reject(error);
                }
              );

            },
            function(error) {
              return deferred.reject(error);
            }
          );

          return deferred.promise;
        } else {
          self.getAll();
        }
      };

      self.getAll = function() {
        var deferred = $q.defer(),
            query = ""+
              "SELECT userSearches.*, restaurants.name " +
              "FROM userSearches, restaurants " +
              "WHERE userSearches.restaurant = restaurants.id "+
              "ORDER BY (CASE WHEN date >= DATETIME('now') THEN 1 ELSE 0 END) DESC, date ASC;";
        appData.db.query(query).then(
          function(result){
            var searches = appData.db.fetchAll(result),
                getLog = function(search, callback) {
                  Logs.get(search.uid).then(
                    function(logs){
                      var searchTime = moment.utc(search.date, "YYYY-MM-DDTHH:mm:ssZ"),
                          now = moment.utc(),
                          limit = moment.utc().add(180, "days");
                      search.past = searchTime.isBefore(now);
                      search.limit = searchTime.isAfter(limit);
                      search.logs = logs;
                      callback();
                    },
                    function(error) {
                      callback(error);
                    }
                  );
                };

            async.each(searches, getLog, function(error){
              //if (error) console.log(error);
              return deferred.resolve(searches);
            });
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.refresh = function(id) {
        id = id || 'all';
        var deferred = $q.defer(),
            url = (id === "all") ? '/api/user/searches/:id' : '/api/search/:id',
            res = $resource(appData.apiUrl+url);
        if (appData.network) {
          res.query({id: id}, function(searches) {
            var ids = [],
                updateSearches = function(data, callback) {
                  self.set(data, false).then(
                    function(res) {
                      //console.log(res);
                      ids.push(res.id);
                      //data = res;
                      callback();
                    },
                    function(error) {
                      if (error.status === 401) {
                        $rootScope.emit("login");
                      }
                      console.error(error);
                      callback(error);
                    }
                  );
                };
            async.each(searches, updateSearches, function(error){
              //if (error) console.log(error);
              if (id === 'all') {
                self.prune(ids).then(
                  function(success) {        
                    return deferred.resolve(searches);
                  },
                  function(error) {
                    return deferred.reject(error);
                  }
                );
              } else {
                return deferred.resolve(searches);
              }
            });
          });
        } else {
          appData.forceRefresh.push = "searches";
          self.getAll().then(
            function(searches) {
              return deferred.resolve(searches);
            },
            function(error) {
              return deferred.reject(error);
            }
          );
        }
        return deferred.promise;
      };

      self.updateServer = function(search) {
        var deferred = $q.defer(),
            res = $resource(
                    appData.apiUrl+'/api/search/:searchId',
                    {},
                    {
                      update: { method: 'PUT' }
                    }
                  );
        if (appData.network) {
          search.restaurantId = search.restaurant;
          if ("id" in search) {
            res.update(
              {searchId: search.id},
              search,
              function(data) {
                return deferred.resolve(data);
              },
              function(error) {
                if (error.status === 401) {
                  $rootScope.emit("login");
                }
                return deferred.reject(error);
              }
            );
          } else {
            res.save(
              search,
              function(data) {
                return deferred.resolve(data);
              },
              function(error) {
                if (error.status === 401) {
                  $rootScope.emit("login");
                }
                return deferred.reject(error);
              }
            );
          }
        } else {
          appData.forceSync.push = "search";
          return deferred.resolve({success: true, deferred: true});
        }

        return deferred.promise;
      };


      self.set = function(search, remote) {
        remote = (remote === null) ? true : remote;
        var deferred = $q.defer(),
            process = function(obj, result, pCallBack) {
              var _search = angular.copy(obj);
              delete _search.logs;
              delete _search.past;
              delete _search.limit;
              var restaurant = angular.copy(_search.restaurant);
              if (typeof restaurant === "object") {
                _search.restaurant = restaurant.id;
              }
              if (result !== null && "id" in result) {
                appData.db.update("userSearches", "id = " + _search.id, _search).then(
                  function(data) {
                    var updateSearchLog = function(log, cback) {
                          Logs.set(log).then(
                            function(result) {
                              //console.log(result);
                              cback();
                            },
                            function(error) {
                              console.error(error);
                              cback(error);
                            }
                          );
                        };

                    async.waterfall([
                      function(callback) {
                        if (remote) {
                          self.updateServer(_search).then(
                            function(ret) {
                              callback(null);
                            },
                            function(error) {
                              callback(error);
                            }
                          );
                        } else {
                          callback(null);
                        }
                      },
                      function(callback) {
                        if ("logs" in obj && obj.logs !== null && obj.logs.length > 0) {
                          async.each(
                            obj.logs,
                            updateSearchLog,
                            function(error){
                              //if (error) console.log(error);
                              self.get(_search.id).then(
                                function(data) {
                                  callback(null, null);
                                },
                                function(error) {
                                  callback(error);
                                }
                              );
                            }
                          );
                        } else {
                          callback(null, null);
                        }
                      }
                    ], function (error, result) {
                      if (error) {
                        pCallBack(null, error);
                      } else {
                        _search.logs = search.logs;
                       pCallBack(_search);

                      }
                    });
                  },
                  function(error) {
                    pCallBack(null, error);
                  }
                );
              } else {
                if (remote) {
                  self.updateServer(_search).then(
                    function(ret) {
                      var _ret = angular.copy(ret);
                      delete _ret.logs;
                      delete _ret.$promise;
                      delete _ret.$resolved;
                      restaurant = angular.copy(_ret.restaurant);
                      if (typeof restaurant === "object") {
                        _ret.restaurant = restaurant.id;
                      }
                      appData.db.insert("userSearches", _ret).then(
                        function(data) {
                          var updateSearchLog = function(log, cback) {
                                Logs.set(log).then(
                                  function(result) {
                                    //console.log(result);
                                    cback();
                                  },
                                  function(error) {
                                    console.error(error);
                                    cback(error);
                                  }
                                );
                              };
                          async.each(ret.logs, updateSearchLog, function(error){
                            //if (error) console.log(error);
                            self.get(ret.id).then(
                              function(result) {
                                pCallBack(ret);
                              },
                              function(error) {
                                pCallBack(null, error);
                              }
                            );
                          });
                        },
                        function(error) {
                          pCallBack(null, error);
                        }
                      );
                    },
                    function(error) {
                      pCallBack(null, error);
                    }
                  );
                } else {
                  appData.db.insert("userSearches", _search).then(
                    function(data) {
                      var updateSearchLog = function(log, cback) {
                            Logs.set(log).then(
                              function(result) {
                                //console.log(result);
                                cback();
                              },
                              function(error) {
                                console.error(error);
                                cback(error);
                              }
                            );
                          };
                      async.each(obj.logs, updateSearchLog, function(error){
                        //if (error) console.log(error);
                        self.get(_search.id).then(
                          function(result) {
                            pCallBack(obj);
                          },
                          function(error) {
                            pCallBack(null, error);
                          }
                        );
                      });
                    },
                    function(error) {
                      pCallBack(null, error);
                    }
                  );
                }
              }
            };
        if ("id" in search) {
          self.get(search.id).then(
            function(res) {
              process(
                search, 
                res, 
                function(obj, err) {
                  if (err) {
                    return deferred.reject(err);
                  } else {
                    return deferred.resolve(obj);
                  }
                }
              );
            }
          );
        } else {
          process(
            search, 
            null,
            function(obj, err) {
              if (err) {
                return deferred.reject(err);
              } else {
                return deferred.resolve(obj);
              }
            }
          );
        }
        return deferred.promise;
      };

      self.delete = function(id, remote) {
        remote = (remote === null) ? false : remote;
        var deferred = $q.defer(),
            dbDelete = function(search) {
             appData.db.query("DELETE FROM userSearches WHERE id = ?", [id]).then(
                function(result){
                  if (search !== null && "uid" in search) {
                    Logs.purge(search.uid).then(
                      function(success) {
                        return deferred.resolve(result);
                      },
                      function(error) {
                        return deferred.reject(error);
                      }
                    );
                  } else {
                    return deferred.resolve(result);
                  }
                },
                function(error) {
                  return deferred.reject(error);
                }
              ); 
            };
        self.get(id).then(
          function(search) {
            if (search) {
              if (remote) {
                self.deleteFromServer(search).then(
                  function(success) {
                    dbDelete(search);
                  },
                  function(error) {
                    return deferred.reject(error);
                  }
                );
              } else {
                dbDelete(search);
              }
            } else {
              return deferred.resolve(search);
            }
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.deleteFromServer = function(search) {
        var deferred = $q.defer(),
            res = $resource(
                    appData.apiUrl+'/api/search/:searchId',
                    {}
                  );
        if (appData.network) {
          res.delete(
            {searchId: search.id},
            search,
            function(data) {
              return deferred.resolve(data);
            },
            function(error) {
              return deferred.reject(error);
            }
          );
        } else {
          appData.forceSync.push = "search";
          return deferred.resolve({success: true, deferred: true});
        }

        return deferred.promise;
      };


      self.prune = function(ids) {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM userSearches WHERE id NOT IN (" + ids.join(",") + ")").then(
          function(result){
            var searches = appData.db.fetchAll(result),
                deleteSearch = function(search, cback) {
                  self.delete(search.id).then(
                    function(result) {
                      //console.log(result);
                      cback();
                    },
                    function(error) {
                      console.error(error);
                      cback(error);
                    }
                  );
                };
            async.each(searches, deleteSearch, function(error){
              //if (error) console.log(error);
              return deferred.resolve(result);
            });
          },
          function(error) {
            return deferred.reject(error);
          }
        );
        return deferred.promise;
      };

      return self;
    }
  )
  .factory('Restaurants',
    function($resource, $q, appData, $rootScope) {
      var self = this;

      self.get = function(id, deleted) {
        deleted = deleted || false;
        var deferred = $q.defer(),
            sql ="";
        if (deleted) {
          sql = "SELECT * FROM restaurants WHERE id = ?";
        } else {
          sql = "SELECT * FROM restaurants WHERE id = ? AND deletedAt IS NULL";
        }
        appData.db.query(sql, [id]).then(
          function(result){
            return deferred.resolve(appData.db.fetchAll(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.getAll = function() {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM restaurants WHERE deletedAt IS NULL ORDER BY name ASC").then(
          function(result){
            return deferred.resolve(appData.db.fetchAll(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.find = function(name) {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM restaurants WHERE name LIKE ? AND deletedAt IS NULL", ["%"+name+"%"]).then(
          function(result){
            return deferred.resolve(appData.db.fetchAll(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.getLatest = function() {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM restaurants ORDER BY updatedAt ASC LIMIT 1").then(
          function(result){
            return deferred.resolve(appData.db.fetch(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.refresh = function() {
        var deferred = $q.defer();
        self.getLatest().then(
          function(result) {
            var url = '/api/restaurants',
                params = {};
            if (result !== null) {
              url += "/:lastUpdated";
              params = {lastUpdated: moment.utc(result.updatedAt, "YYYY-MM-DDTHH:mm:ssZ").add(1,"seconds").format("X")};
            }
            var res = $resource(appData.apiUrl+url);
            if (appData.network) {
              res.query(params, function(restaurants) {
                var updateRestaurants = function(restaurant, callback) {
                      self.set(restaurant).then(
                        function(result) {
                          //console.log(result);
                          callback();
                        },
                        function(error) {
                          if (error.status === 401) {
                            $rootScope.emit("login");
                          }
                          console.error(error);
                          callback(error);
                        }
                      );
                    };
                async.each(restaurants, updateRestaurants, function(error){
                  //console.log(error)
                  return deferred.resolve(restaurants);
                });
              });
            } else {
              appData.forceRefresh.push = "restaurants";
              return deferred.resolve({success: true, deferred: true});
            }
          },
          function(error) {
            console.error(error);
            return deferred.reject(error);
          }
        );
        return deferred.promise;
      };

      self.set = function(restaurant) {
        var deferred = $q.defer();
        self.get(restaurant.id, true).then(function(result) {
          if (result.length > 0) {
            appData.db.update("restaurants", "id = '" + restaurant.id + "'", restaurant).then(
              function(data) {
                return deferred.resolve(result);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          } else {
            appData.db.insert("restaurants", restaurant).then(
              function(data) {
                return deferred.resolve(result);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          }
        });
        return deferred.promise;
      };

      return self;
    }
  )
  .factory('Settings',
    function($resource, $q, appData) {
      var self = this;

      self.get = function(key) {
        key = key || null;
        if (key !== null) {
          var deferred = $q.defer();
          appData.db.query("SELECT * FROM settings WHERE key = ?", [key]).then(
            function(result){
              return deferred.resolve(appData.db.fetch(result));
            },
            function(error) {
              return deferred.reject(error);
            }
          );

          return deferred.promise;
        } else {
          self.getAll();
        }
      };

      self.getAll = function() {
        var deferred = $q.defer();
        appData.db.query("SELECT * FROM settings ORDER BY key ASC").then(
          function(result){
            return deferred.resolve(appData.db.fetchAll(result));
          },
          function(error) {
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.set = function(setting) {
        var deferred = $q.defer();
        self.get(setting.key).then(function(result) {
          if (result !== null) {
            appData.db.update("settings", "id = " + result.id, setting).then(
              function(data) {
                return deferred.resolve(data);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          } else {
            appData.db.insert("settings", setting).then(
              function(data) {
                return deferred.resolve(data);
              },
              function(error) {
                return deferred.reject(error);
              }
            );
          }
        });
        return deferred.promise;
      };

      return self;
    }
  )
  .factory('Login', [
    '$resource',
    'appData',
    function($resource, appData) {
      return $resource(appData.apiUrl+'/api/mobile/login/:email');
    }
  ])
  .factory('Toast',
    function($cordovaToast, $q, toastr) {
      var self = this;

      self.show = function(message, duration, position) {
        var deferred = $q.defer();
        message = message || "Nothing";
        duration = duration || "short";
        position = position || "top";

        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          $cordovaToast
          .show(message, duration, position)
          .then(function(success) {
            return deferred.resolve(success);
          }, function (error) {
            return deferred.reject(error);
          });
        } else {
          toastr.success(message, 'Information');
        }

        return deferred.promise;
      };

      return self;
    }
  )

  .factory('Preferences',
    function($q, appData) {
      var self = this;


      self.init = function() {
        var deferred = $q.defer();
        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          self.prefs = window.plugins.appPreferences;
        }
      };

      self.get = function(preference) {
        var deferred = $q.defer();
        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          self.prefs.fetch(
            function(value) {
              return deferred.resolve(value);
            },
            function(error) {
              return deferred.reject(error);
            },
            preference
          );
          return deferred.promise;
        } else {
          return true;
        }
      };

      self.set = function(preference, value) {
        var deferred = $q.defer();
        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          self.prefs.store(
            function(value) {
              return deferred.resolve(value);
            },
            function(error) {
              return deferred.reject(error);
            },
            preference,
            value
          );

          return deferred.promise;
        } else {
          return true;
        }
      };

      return self;
    }
  );

  angular.module('dining.push', ['dining.config', 'ngResource', 'ngCordova', 'ionic.utils', 'dining.services', 'angular-lodash'])
  .factory('Push',
    function($q, $cordovaPush, $rootScope, $http, $localstorage, Settings, $resource, $ionicPlatform, $cordovaLocalNotification, $cordovaDevice, Preferences, appData) {
      var self = this;
      self.token = null;
      self.type = "device";
      self.config = {};
      self.registerDisabled = false;
      self.notifications = [];


      // Register
      self.register = function() {
        if (ionic.Platform.isAndroid()) {
          self.config = {
            "senderID": "642847737907"
          };
        } else if (ionic.Platform.isIOS()) {
          self.config = {
            "badge": "true",
            "sound": "true",
            "alert": "true"
          };
        } else {
          self.socket = io.connect(appData.apiUrl);
          self.type = "web";
        }

        if (ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
          Settings.get("token").then(
            function(data) {
              //console.log(data);

              $ionicPlatform.ready(function() {
                $cordovaPush.register(self.config).then(
                  function (result) {
                    //console.log("Register success " + result);
                    self.registerDisabled = true;
                    // ** NOTE: Android regid result comes back in the pushNotificationReceived, only iOS returned here
                    if (ionic.Platform.isIOS()) {
                      self.token = result;
                      self.storeDeviceToken("ios");
                    }

                    return result;
                  },
                  function (err) {
                    //console.log("Register error " + err)
                    return err;
                  }
                );
              });

            },
            function(error) {
              console.error(error);
            }
          );

        } else {
          self.socket.on('talk', function(data) {
            //console.log(data);
            if (data.objectType === "search-update") {
              $rootScope.$emit('push:search-update', data.uid);
            }
          });
          self.socket.on('connect', function() {
            //console.log("socket connected");
          });

          self.socket.emit('ready', {'user': 1});
        }
      };

      self.get = self.register;

      // Android Notification Received Handler
      self.handleAndroid = function(notification) {
        // ** NOTE: ** You could add code for when app is in foreground or not, or coming from coldstart here too
        //             via the console fields as shown.
        //console.log("In foreground " + notification.foreground  + " Coldstart " + notification.coldstart);
        if (notification.event === "registered") {
          self.token = notification.regid;
          self.storeDeviceToken("android");
        } else if (notification.event === "message") {
          if (notification.payload.type === "search-update") {
            var localNotification = function(data) {
                  $cordovaLocalNotification.add({
                    id:         0,
                    message:    data.restaurant + ": " + data.message,
                    title:      "Scout reporting"
                  }).then(function () {
                    //console.log('callback for adding background notification');
                  });
                };
            $rootScope.$emit('push:search-update', notification.payload.extra.uid);
            if (notification.payload.extra.foundSeats) {
              localNotification(notification.payload.extra);
            }
          } else if (notification.payload.type === "search-edit") {
            $rootScope.$emit('push:search-edit', notification.payload.extra.id);
          } else if (notification.payload.type === "search-add") {
            $rootScope.$emit('push:search-add', notification.payload.extra.id);
          } else if (notification.payload.type === "user-update") {
            $rootScope.$emit('push:user-update', notification.payload.extra.id);
          } else if (notification.payload.type === "search-delete") {
            $rootScope.$emit('push:search-delete', notification.payload.extra);
          } else if (notification.payload.type === "restaurant-update") {
            $rootScope.$emit('push:restaurant-update', notification.payload.extra);
          }
        } else if (notification.event === "error") {
          var test0 = notification.event;
          //$cordovaDialogs.alert(notification.msg, "Push notification error event");
        } else {
          var test1;
          //$cordovaDialogs.alert(notification.event, "Push notification handler - Unprocessed Event");
        }
      };

      // IOS Notification Received Handler
      self.handleIOS = function(notification) {

        if (notification.foreground === "1") {
          // The app was already open but we'll still show the alert and sound the tone received this way. If you didn't check
          // for foreground here it would make a sound twice, once when received in background and upon opening it from clicking
          // the notification when this code runs (weird).

          // Play custom audio if a sound specified.
          if (notification.sound) {
            //var mediaSrc = $cordovaMedia.newMedia(notification.sound);
            //mediaSrc.promise.then($cordovaMedia.play(mediaSrc.media));
          }

          if (notification.body && notification.messageFrom) {
            //$cordovaDialogs.alert(notification.body, notification.messageFrom);
          } else {
            //$cordovaDialogs.alert(notification.alert, "Push Notification Received");
          }

          if (notification.badge) {
            $cordovaPush.setBadgeNumber(notification.badge).then(
              function (result) {
                //console.log("Set badge success " + result)
              }, function (err) {
                //console.log("Set badge error " + err)
              }
            );
          }
        } else {
          // Otherwise it was received in the background and reopened from the push notification. Badge is automatically cleared
          // in this case. You probably wouldn't be displaying anything at this point, this is here to show that you can process
          // the data in this situation.

          if (notification.body && notification.messageFrom) {
            //$cordovaDialogs.alert(notification.body, "(RECEIVED WHEN APP IN BACKGROUND) " + notification.messageFrom);
          } else {
            //$cordovaDialogs.alert(notification.alert, "(RECEIVED WHEN APP IN BACKGROUND) Push Notification Received");
          }
        }
      };

      self.joinRoom = function(uid) {
        self.socket.emit('room:join', uid);
      };

      self.leaveRoom = function(uid) {
        self.socket.emit('room:leave', uid);
      };

      // Stores the device token in a db using node-pushserver (running locally in this case)
      //
      // type:  Platform type (ios, android etc)
      self.storeDeviceToken = function(type) {
        // Create a random userid to store with it
        var uuid = $cordovaDevice.getUUID(),
            device = {
              type: type,
              token: self.token,
              uuid: uuid
            };
        Settings.set({key:"token", value:self.token}).then(
          function(data) {
            //console.log(data);
          },
          function(error) {
            console.error(error);
          }
        );
        Settings.set({key:"tokenType", value:type}).then(
          function(data) {
            //console.log(data);
          },
          function(error) {
            console.error(error);
          }
        );

        //console.log("Post token for registered device with data " + JSON.stringify(device));
        var deferred = $q.defer(),
            res = $resource(appData.apiUrl+'/api/mobile/messaging/token');
        res.save(
          device,
          function(response) {
            //console.log(response);
            return deferred.resolve(response);
          },
          function(error) {
            if (error.status === 401) {
              $rootScope.emit("login");
            } 
            return deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      self.retrieveDeviceToken = function() {
        var deferred = $q.defer();
        Settings.get("token").then(
          function(data) {
            return deferred.resolve(data);
          },
          function(error) {
            return deferred.reject(error);
          }
        );
        return deferred.promise;
      };

      // Removes the device token from the db via node-pushserver API unsubscribe (running locally in this case).
      // If you registered the same device with different userids, *ALL* will be removed. (It's recommended to register each
      // time the app opens which this currently does. However in many cases you will always receive the same device token as
      // previously so multiple userids will be created with the same token unless you add code to check).
      self.removeDeviceToken = function() {
        var tkn = { token: self.token };
        $http.post('http://192.168.1.16:8000/unsubscribe', JSON.stringify(tkn))
          .success(function (data, status) {
              //console.log("Token removed, device is successfully unsubscribed and will not receive push notifications.");
          })
          .error(function (data, status) {
              //console.log("Error removing device token." + data + " " + status)
          }
        );
      };

      // Unregister - Unregister your device token from APNS or GCM
      // Not recommended:  See http://developer.android.com/google/gcm/adv.html#unreg-why
      //                   and https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIApplication_Class/index.html#//apple_ref/occ/instm/UIApplication/unregisterForRemoteNotifications
      //
      // ** Instead, just remove the device token from your db and stop sending notifications **
      self.unregister = function() {
        //console.log("Unregister called");
        self.removeDeviceToken();
        self.registerDisabled = false;
      };

      return self;
    }
  );
}());
