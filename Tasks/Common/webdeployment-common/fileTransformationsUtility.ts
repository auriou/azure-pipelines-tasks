import tl = require('vsts-task-lib/task');
import fs = require('fs');
import path = require('path');

var zipUtility = require('webdeployment-common/ziputility.js');
var utility = require('webdeployment-common/utility.js');
var jsonSubstitutionUtility = require('webdeployment-common/jsonvariablesubstitutionutility.js');
var xmlSubstitutionUtility = require('webdeployment-common/xmlvariablesubstitutionutility.js');
var xdtTransformationUtility = require('webdeployment-common/xdttransformationutility.js');

export function fileTransformations(isFolderBasedDeployment: boolean, JSONFiles: any, xmlTransformation: boolean, xmlVariableSubstitution: boolean, folderPath: string, 
    isMSBuildPackage: boolean, envName: string, DeleteFiles: any, CopyDir: string) {

        console.log(" ***** fileTransformations v2 ****** ");

    if(xmlTransformation) {
        if(isMSBuildPackage) {
            var debugMode = tl.getVariable('system.debug');
            if(debugMode && debugMode.toLowerCase() == 'true') {
                tl.warning(tl.loc('AutoParameterizationMessage'));
            }
            else {
                console.log(tl.loc('AutoParameterizationMessage'));
            }
        }
        var environmentName = tl.getVariable('Release.EnvironmentName');
        if(envName && envName.length > 0) {
            environmentName = envName;
        }
        if(tl.osType().match(/^Win/)) {

            if(DeleteFiles!=null && DeleteFiles.length != 0) {
                for(let deleteFile of DeleteFiles){
                    var folders = xdtTransformationUtility.expandWildcardPattern(folderPath, deleteFile);
                    Object.keys(folders).forEach(function (folder) {
                        var elem = folders[folder];
                        console.log("=> EXTRA COMMAND - DELETE : " + elem );
                        if(!elem.endsWith(environmentName)){
                            tl.rmRF(elem);
                        }
                    });
                }
            }
            
            if(CopyDir != null) {
                var dir = folderPath + "\\Config\\" + environmentName + "\\" + CopyDir ;
                var folders = xdtTransformationUtility.expandWildcardPattern(dir, "**");
                    Object.keys(folders).forEach(function (folder) {
                        var elem = folders[folder];
                        console.log("=> EXTRA COMMAND - COPY : " + elem);
                        tl.cp(elem, folderPath, "-rf");
                    });
            }

            var transformConfigs = ["Release.config"];
            if(environmentName && environmentName.toLowerCase() != 'release') {
                transformConfigs.push(environmentName + ".config");
            }
            var isTransformationApplied: boolean = xdtTransformationUtility.basicXdtTransformation(folderPath, transformConfigs);

            if(envName && envName.length > 0) {
                var folders = xdtTransformationUtility.expandWildcardPattern(folderPath, '**/Config/*');
                Object.keys(folders).forEach(function (folder) {
                    var elem = folders[folder];
                    if(!elem.endsWith(environmentName)){
                        tl.rmRF(elem);
                    }
                });

                var files = xdtTransformationUtility.expandWildcardPattern(folderPath, '**/Web.*.config');
                Object.keys(files).forEach(function (file) {
                    var elem = files[file];
                    tl.rmRF(elem);
                });
            }
            
            if(isTransformationApplied)
            {
                console.log(tl.loc("XDTTransformationsappliedsuccessfully"));
            }
            
        }
        else {
            throw new Error(tl.loc("CannotPerformXdtTransformationOnNonWindowsPlatform"));
        }
    }

    if(xmlVariableSubstitution) {
        xmlSubstitutionUtility.substituteAppSettingsVariables(folderPath, isFolderBasedDeployment);
        console.log(tl.loc('XMLvariablesubstitutionappliedsuccessfully'));
    }

    if(JSONFiles.length != 0) {
        jsonSubstitutionUtility.jsonVariableSubstitution(folderPath, JSONFiles);
        console.log(tl.loc('JSONvariablesubstitutionappliedsuccessfully'));
    }
}