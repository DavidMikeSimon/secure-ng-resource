﻿'use strict';

angular.module('secureNgResource')
.factory('session', [
'$q', '$location', '$cookieStore',
function($q, $location, $cookieStore) {
    var DEFAULT_SETTINGS = {
        sessionName: 'angular',
        loginPath: '/login',
        defaultPostLoginPath: '/'
    };

    var sessionDictionary = {};

    var Session = function (auth, settings) {
        this.auth = auth;
        this.settings = angular.extend(
            {},
            DEFAULT_SETTINGS,
            settings
        );

        this.priorPath = null;
        this.state = null;
        this.managedHttpConfs = [];

        sessionDictionary[this.cookieKey()] = this;
        var cookie = $cookieStore.get(this.cookieKey());
        if (cookie) {
            this.state = cookie;
        } else {
            this.reset();
        }
    };
    
    Session.prototype = {
        getUserName: function () {
            if (this.loggedIn()) {
                return this.state.user;
            }
        },

        loggedIn: function () {
            // TODO Check for timeout
            return this.state !== null;
        },

        login: function (credentials, callbacks) {
            var me = this;
            var handler = function(result) {
                if (angular.isObject(callbacks) && callbacks[result.status]) {
                    callbacks[result.status](result);
                }

                if (result.status === 'accepted') {
                    me.state = result.newState;
                    me.reupdateManagedRequestConfs();
                    $cookieStore.put(me.cookieKey(), me.state);
                    var tgt = me.settings.defaultPostLoginPath;
                    if (me.priorPath !== null) { tgt = me.priorPath; }
                    $location.path(tgt).replace();
                }
            };

            this.auth.checkLogin(credentials, handler);
        },

        logout: function () {
            if (this.loggedIn()) {
                this.reset();
                $location.path(this.settings.loginPath);
            }
        },

        reset: function () {
            this.state = null;
            this.reupdateManagedRequestConfs();
            $cookieStore.remove(this.cookieKey());
        },

        cookieKey: function () {
            return this.settings.sessionName + '-' + this.auth.getAuthType();
        },

        updateRequestConf: function(httpConf) {
            httpConf.sessionDictKey = this.cookieKey();
            if (this.loggedIn()) {
                if (!httpConf.headers) { httpConf.headers = {}; }
                this.auth.addAuthToRequestConf(httpConf, this.state);
            }
        },

        manageRequestConf: function(httpConf) {
            this.managedHttpConfs.push({
                conf: httpConf,
                original: angular.copy(httpConf)
            });
            this.updateRequestConf(httpConf);
        },

        reupdateManagedRequestConfs: function() {
            var me = this;
            angular.forEach(this.managedHttpConfs, function(o) {
                for (var key in o.conf) { delete o.conf[key]; }
                var originalConf = angular.copy(o.original);
                angular.extend(o.conf, originalConf);
                me.updateRequestConf(o.conf);
            });
        },

        handleHttpResponse: function(response) {
            var authResult = this.auth.checkResponse(response);
            if (authResult.authFailure) {
                this.reset();
                this.priorPath = $location.path();
                $location.path(this.settings.loginPath).replace();
                return $q.reject(response);
            } else {
                return response;
            }
        }
    };

    var SessionFactory = function(auth, settings) {
        return new Session(auth, settings);
    };
    SessionFactory.dictionary = sessionDictionary;
    return SessionFactory;
}]);
