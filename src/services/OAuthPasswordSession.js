'use strict';

angular.module('secureNgResource')
.factory('oauthPasswordSession', [
'$q', '$http', 'sessionBase',
function($q, $http, sessionBase) {
    var OAuthPasswordSession = function (host, clientId, clientSecret, settings) {
        this.initialize(host, angular.extend(
            {},
            settings,
            {
                host: host,
                clientId: clientId,
                clientSecret: clientSecret
            }
        ));
    };

    OAuthPasswordSession.prototype = {
        login: function (user, pass, loginCallbacks) {
            $http({
                method: 'POST',
                url: this.settings.host + '/oauth/v2/token',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                data: $.param({
                    'client_id': this.settings.clientId,
                    'client_secret': this.settings.clientSecret,
                    'grant_type': 'password',
                    'username': user,
                    'password': pass
                })
            }).then(function(response) {
                if (
                response.status === 200 &&
                _(response.data).has('access_token')
                ) {
                    // Successful login
                    if (loginCallbacks.accepted) { loginCallbacks.accepted(); }
                    this.state = {
                        user: user,
                        accessToken: response.data['access_token'],
                        accessTokenExpires:
                            new Date().getTime() + response.data['expires_in'],
                        refreshToken: response.data['refresh_token']
                    };
                    this.loginSucceeded();
                } else if (
                response.status === 400 &&
                _(response.data).has('error') &&
                response.data.error === 'invalid_grant'
                ) {
                    // Bad login
                    if (loginCallbacks.denied) { loginCallbacks.denied(); }
                } else {
                    // Unknown error
                    if (loginCallbacks.error) {
                        var msg = 'HTTP Status ' + response.status;
                        if (response.status === 0) {
                            msg = 'Unable to connect to authentication server';
                        } else if ( _(response.data).has('error_description')) {
                            msg = 'OAuth:' + response.data['error_description'];
                        }
                        loginCallbacks.error(msg);
                    }
                }
            });
        },

        addAuthToRequest: function (httpConf) {
            if (this.loggedIn()) {
                if (!_.isObject(httpConf.headers)) { httpConf.headers = {}; }
                httpConf.headers.Authorization = 'Bearer ' + this.state.accessToken;
            }
            httpConf.sessionCookieKey = this.cookieKey();
        },

        handleHttpFailure: function (response) {
            if (response.status === 401) {
                this.sessionFailed(),
                return $q.reject(response);
            } else {
                return response;
            }
        }
    };

    angular.extend(OAuthPasswordSession.prototype, sessionBase);

    var OAuthPasswordSessionFactory =
    function(host, clientId, clientSecret, options) {
        return new OAuthPasswordSession(host, clientId, clientSecret, options);
    };

    return OAuthPasswordSessionFactory;
}]);
