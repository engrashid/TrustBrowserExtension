var app = angular.module("myApp", []);
app.controller("trustlistCtrl", function($scope) {

    $scope.init = function() {    
        $scope.showContainer = false; // Less flickring
        $scope.history = [];

        console.log("Loading Settings");
        $scope.settingsController = new SettingsController();
        $scope.settingsController.loadSettings(function (settings) {
            $scope.settings = settings;
            $scope.packageBuilder = new PackageBuilder(settings);
            $scope.subjectService = new SubjectService(settings, $scope.packageBuilder);
            $scope.trustchainService = new TrustchainService(settings);

            $scope.addListeners();
            $scope.requestProfile(null); // Default 
        });
    }

    $scope.requestProfile = function(profile_name) {
        console.log("RequestData send to background page");
        chrome.runtime.sendMessage({ command: 'requestData', profile_name: null }, function(response) {
            console.log("RequestData response from background page");
            console.log(response);

            $scope.contentTabId = response.contentTabId;

            $scope.loadOnData(response.data);
        });
    }

    $scope.addListeners = function() {
        console.log("Adding Listener for calls from the background page.");
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                console.log("Listener request from background page");
                console.log(request);

                if (request.command == "showTarget") {
                    $scope.contentTabId = request.contentTabId;
                   
                    $scope.loadOnData(request.data);

                    if(sendResponse)
                        sendResponse({result: "ok"});
                }
            });
    }

    $scope.loadOnData = function(profile) {
        $scope.trustHandler = new TrustHandler(profile.queryResult, $scope.settings);
        $scope.trustHandler.BuildSubjects();

        $scope.load(profile);
    }

    $scope.reset = function() {
        $scope.subject = null;
        $scope.binarytrusts = [];
        $scope.trusted = [];
        $scope.distrusted = [];
        $scope.jsonVisible = false;
    }

    $scope.load = function(subject) {
        $scope.reset();
        $scope.subject = subject;

        if(!$scope.subject.identiconData64)
            Object.defineProperty($scope.subject, 'identiconData64', { value: $scope.getIdenticoinData($scope.subject.address), writable: false });

        if(!$scope.subject.owner)
            $scope.subject.owner = {}

        // The subject has an owner
        if($scope.subject.owner.address) {
            if(!$scope.subject.owner.identiconData16)
                Object.defineProperty($scope.subject.owner, 'identiconData16', { value: $scope.getIdenticoinData($scope.subject.owner.address, 16), writable: false });
        }

        $scope.subject.trusts = $scope.trustHandler.subjects[$scope.subject.address];
        $scope.subject.binaryTrust = $scope.trustHandler.CalculateBinaryTrust($scope.subject.address);

        for(var index in $scope.subject.trusts) {
            var trust = $scope.subject.trusts[index];

            if(!trust.owner) {
                let owner = {  
                    address: trust.issuer.address
                }
                Object.defineProperty(trust, 'owner', { value: owner, writable: false });
            }

            // If trust is a BinaryTrust, decorate the trust object with data
            if(trust.type == PackageBuilder.BINARY_TRUST_DTP1) {
                $scope.binarytrusts[trust.subject.address] = trust;

                if(!trust.identiconData64)
                    Object.defineProperty(trust, 'identiconData64', { value: $scope.getIdenticoinData(trust.issuer.address), writable: false });

                // Add trust to the right list
                if(trust.claimObj.trust)
                    $scope.trusted.push(trust);
                else
                    $scope.distrusted.push(trust);
                
                Object.defineProperty(trust, 'showTrustButton', { value: !($scope.subject.binaryTrust.direct && $scope.subject.binaryTrust.directValue), writable: false });
                Object.defineProperty(trust, 'showDistrustButton', { value: !($scope.subject.binaryTrust.direct && !$scope.subject.binaryTrust.directValue), writable: false });
                Object.defineProperty(trust, 'showUntrustButton', { value: $scope.subject.binaryTrust.direct, writable: false });
                
                var alias = $scope.trustHandler.alias[trust.issuer.address];
                if(alias && alias.length > 0) {
                    var item = alias[0];
                    let screen_name = item.claimObj.alias;
                    trust.address = screen_name.hash160().toDTPAddress();
                    trust.alias = screen_name + (trust.showUntrustButton ? " (You)": "");
                } else {
                  if($scope.subject.binaryTrust.direct) 
                    trust.alias = "(You)";
                }
                if(!trust.alias || trust.alias == "") {
                    trust.alias = trust.address;
                }
                
            }
        }

        
        $scope.json = JSON.stringify(subject, undefined, 2);
        $scope.showContainer = true;
        $scope.$apply();
    }

    $scope.analyseClick = function(trust) {
        $scope.history.push($scope.subject);

        let profile = {};
        profile.address = trust.issuer.address;
        profile.alias = trust.alias;
        profile.screen_name = trust.alias;
        profile.queryResult = $scope.subject.queryResult;

        $scope.load(profile);
    }


    $scope.historyBack = function() {
        $scope.load($scope.history.pop());
    }

    $scope.showHideJson = function() {
        $scope.jsonVisible = ($scope.jsonVisible) ? false: true;
    }


    $scope.getIdenticoinData = function(address, size) {
        if(!size) size = 64;
        return new Identicon(address, {margin:0.1, size:size, format: 'svg'}).toString();
    };

    $scope.trustDataClick = function(trust) {
        $scope.trustchainService.GetSimilarTrust(trust).done(function(result){
            $scope.trustData =  JSON.stringify(result.data, undefined, 2);
            $scope.jsonVisible = true;
        });
    }

    $scope.verifyTrustLink = function(trust) {


        var url = $scope.settings.infoserver+
            "/trusts?issuerAddress="+encodeURIComponent(trust.issuer.address)+
            "&subjectAddress="+encodeURIComponent(trust.subject.address)+
            "&type="+encodeURIComponent(trust.type)+
            "&scopetype="+encodeURIComponent((trust.scope) ? trust.scope.type : "")+
            "&scopevalue="+encodeURIComponent((trust.scope) ? trust.scope.value : "");
        return url;
    }


    $scope.trustClick = function(profile) {
        $scope.buildAndSubmitBinaryTrust(profile, true, 0, profile.alias + " trusted");
        return false;
    };

    $scope.distrustClick = function(profile) {
        $scope.buildAndSubmitBinaryTrust(profile, false, 0, profile.alias + " distrusted");
        return false;
    }

    $scope.untrustClick = function(profile) {
        $scope.buildAndSubmitBinaryTrust(profile, undefined, 1, profile.alias + " untrusted");
        return false;
    }

    $scope.buildAndSubmitBinaryTrust = function(profile, value, expire, message) {
        var package = $scope.subjectService.BuildBinaryTrust(profile, value, null, expire);
        $scope.packageBuilder.SignPackage(package);
        $scope.trustchainService.PostTrust(package).done(function(trustResult){
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            $.notify(message, 'success');

            var opt = {
                command: 'updateContent',
                contentTabId: $scope.contentTabId
            }
            chrome.runtime.sendMessage(opt);

        }).fail(function(trustResult){ 
            $.notify("Adding trust failed: " +trustResult.message,"fail");
        });
    }

    
});