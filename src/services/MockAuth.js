'use strict';

angular.module('secureNgResource')
.factory('mockAuth', [
'$q',
function($q) {
    var MockAuth = function() {};

    var guessUser = function(credentials) {
        if (credentials.user) {
            return credentials.user;
        }

        if (credentials['openid_identifier']) {
            var oid = credentials['openid_identifier'];
            var re = /^https:\/\/([^\/]+)\/.*?([^\/]+)$/;
            var match = re.exec(oid);
            if (match) {
                return match[2] + '@' + match[1];
            }
        }

        return 'john.doe@example.com';
    };

    MockAuth.prototype = {
        getAuthType: function () {
            return 'MockAuth';
        },

        checkLogin: function (credentials) {
            var deferred = $q.defer();
            if (
                String(credentials.pass).indexOf('fail') > -1 ||
                String(credentials['openid_identifier']).indexOf('fail') > -1
            ) {
                deferred.reject({status: 'denied'});
            } else {
                deferred.resolve({
                    status: 'accepted',
                    newState: {
                        user: guessUser(credentials)
                    }
                });
            }

            return deferred.promise;
        }
    };

    var MockAuthFactory = function() {
        return new MockAuth();
    };
    return MockAuthFactory;
}]);