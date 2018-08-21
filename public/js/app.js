'use strict';

var reCaptchaModule = angular.module('reCaptchaModule', [])
    .directive('recaptchaCustom', function($rootScope, $compile) {
        return {
            restrict: 'AE',
            template: '<div class="recaptcha-placeholder"></div>',
            scope: {},
            replace: true,
            controller: function($scope, $element) {
                var deregister = $scope.$on('captchaPublicKeyUpdate', function(event, args) {
                    var el = $compile('<div vc-recaptcha ng-model="captcha" lang="en" class="g-recaptcha" key="\'' + args.captchaPublicKey + '\'"></div>')($scope);
                    $element.replaceWith(el);
                    deregister();
                });
            }
        }
    });

angular.module("faucet", ['ngFx', 'vcRecaptcha', 'reCaptchaModule'])
    .controller("mainController", function ($scope, $http, vcRecaptchaService) {
        $scope.getBase = function () {
            $scope.error = null;

            return $http.get("/api/getBase").then(function (resp) {
                $scope.error = null;

                if (resp.data && resp.data.success) {
                    $scope.available = resp.data.balance;
                    $scope.amount = resp.data.amount;
                    $scope.donation_address = resp.data.donation_address;
                    $scope.blockHideForm = false;
                    $scope.captchaKey = resp.data.captchaKey;
                    $scope.totalCount = resp.data.totalCount;
                    $scope.network = resp.data.network;
                } else {
                    $scope.blockHideForm = true;
                    if (resp.data && resp.data.error) {
                        $scope.error = resp.data.error;
                    } else {
                        $scope.error = "Faucet node is offline, please try again later";
                    }
                }
            });
        }

        $scope.send = function () {
            $scope.error = null;
            $scope.txId = null;
            $scope.loading = true;

            $http.post("/api/sendLisk", {
                address : $scope.address,
                captcha : vcRecaptchaService.getResponse()
            }).then(function (resp) {
                $scope.loading = false;
                $scope.error = null;

                if (resp.data && resp.data.success) {
                    $scope.txId = true;
                    $scope.address = "";
                    vcRecaptchaService.reload();
                    $scope.getBase();
                } else {
                    if (resp.data && resp.data.error) {
                        $scope.error = resp.data.error;
                    } else {
                        $scope.error = "Faucet node is offline, please try again later";
                    }
                    vcRecaptchaService.reload();
                }
            });
        }

        $scope.getBase().then(function() {
            $scope.$broadcast('captchaPublicKeyUpdate', { captchaPublicKey: $scope.captchaKey });
        });
    });
