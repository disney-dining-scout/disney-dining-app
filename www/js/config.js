angular.module('dining.config', [])
.constant('DB_CONFIG', {
    name: 'DB',
    tables: [
      {
        name: 'settings',
        columns: [
            {name: 'id', type: "integer primary key"},
            {name: 'key', type: "text"},
            {name: 'value', type: "text"}
        ],
        data: [
          [1, "apiUrl", "http://mvoss-laptop:3001"],
          [2, "token", ""],
          [3, "lastSync", ""]
        ]
      },
      {
        name: 'user',
        columns: [
          {name: 'id', type: "integer NULL PRIMARY KEY"},
          {name: 'email', type: "varchar(255) NULL"},
          {name: 'password', type: "varchar(255) NULL"},
          {name: 'firstName', type: "varchar(255) NULL"},
          {name: 'lastName', type: "varchar(255) NULL"},
          {name: 'zipCode', type: "varchar(15) NULL"},
          {name: 'phone', type: "varchar(25) NULL"},
          {name: 'carrier', type: "varchar(100) NULL"},
          {name: 'sendTxt', type: "integer NULL DEFAULT '0'"},
          {name: 'sendEmail', type: "integer NULL DEFAULT '1'"},
          {name: 'emailTimeout', type: "nteger NULL DEFAULT '14400'"},
          {name: 'smsTimeout', type: "integer NULL DEFAULT '14400'"},
          {name: 'activated', type: "integer DEFAULT '0'"},
          {name: 'admin', type: "integer NULL DEFAULT '0'"},
          {name: 'subExpires', type: "datetime NULL DEFAULT '0000-00-00 00:00:00'"},
          {name: 'eula', type: "datetime NULL DEFAULT '0000-00-00 00:00:00'"},
          {name: 'createdAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'updatedAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'deletedAt', type: "datetime NULL DEFAULT NULL"}
         ],
         data: []
      },
      {
        name: 'userSearches',
        columns: [
          {name: 'id', type: "integer NULL PRIMARY KEY"},
          {name: 'restaurant', type: "varchar(255) NULL"},
          {name: 'created', type: "timestamp NULL DEFAULT CURRENT_TIMESTAMP"},
          {name: 'date', type: "datetime NULL"},
          {name: 'partySize', type: "integer NULL"},
          {name: 'uid', type: "varchar(255) NULL"},
          {name: 'user', type: "varchar(255) NULL"},
          {name: 'enabled', type: "integer NULL DEFAULT '1'"},
          {name: 'deleted', type: "integer NULL DEFAULT '0'"},
          {name: 'lastEmailNotification', type: "datetime NULL DEFAULT '0000-00-00 00:00:00'"},
          {name: 'lastSMSNotification', type: "datetime NULL DEFAULT '0000-00-00 00:00:00'"},
          {name: 'createdAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'updatedAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'deletedAt', type: "datetime NULL DEFAULT NULL"}
         ],
         data: []
      },
      {
        name: 'restaurants',
        columns: [
          {name: 'id', type: "varchar(255) NULL PRIMARY KEY"},
          {name: 'name', type: "varchar(255) NULL"},
          {name: 'createdAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'updatedAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'deletedAt', type: "datetime NULL DEFAULT NULL"}
         ],
         data: []
      },
      {
        name: 'searchLogs',
        columns: [
          {name: 'id', type: "integer NULL PRIMARY KEY"},
          {name: 'uid', type: "varchar(255) NULL"},
          {name: 'dateSearched', type: "timestamp NULL DEFAULT CURRENT_TIMESTAMP"},
          {name: 'message', type: "varchar(255) NULL"},
          {name: 'foundSeats', type: "integer NULL DEFAULT '0'"},
          {name: 'times', type: "text NULL"},
          {name: 'createdAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'updatedAt', type: "datetime NULL DEFAULT NULL"},
          {name: 'deletedAt', type: "datetime NULL DEFAULT NULL"}
         ],
         data: []
      },
    ]
});
