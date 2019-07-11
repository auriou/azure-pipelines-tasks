import tl = require('vsts-task-lib/task');
import fs = require('fs');
import path = require('path');
import * as ParameterParser from './ParameterParserUtility';

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

export function advancedFileTransformations(isFolderBasedDeployment: boolean, targetFiles: any, xmlTransformation: boolean, variableSubstitutionFileFormat: string, folderPath: string, transformationRules: any) {

    if(xmlTransformation) {
        if(!tl.osType().match(/^Win/)) {
            throw Error(tl.loc("CannotPerformXdtTransformationOnNonWindowsPlatform"));
        }
        else {
            let isTransformationApplied: boolean = true;
            if(transformationRules.length > 0) {                
                transformationRules.forEach(function(rule) {
                    var args = ParameterParser.parse(rule);
                    if(Object.keys(args).length < 2 || !args["transform"] || !args["xml"]) {
                       tl.error(tl.loc("MissingArgumentsforXMLTransformation"));
                    }
                    else if(Object.keys(args).length > 2) {
                        isTransformationApplied = xdtTransformationUtility.specialXdtTransformation(folderPath, args["transform"].value, args["xml"].value, args["result"].value) && isTransformationApplied;
                    }
                    else {
                        isTransformationApplied = xdtTransformationUtility.specialXdtTransformation(folderPath, args["transform"].value, args["xml"].value) && isTransformationApplied;
                    }
                });
            }
            else{   
                var environmentName = tl.getVariable('Release.EnvironmentName');             
                let transformConfigs = ["Release.config"];
                if(environmentName && environmentName.toLowerCase() != 'release') {
                    transformConfigs.push(environmentName + ".config");
                }
                isTransformationApplied = xdtTransformationUtility.basicXdtTransformation(folderPath, transformConfigs);
            }
            
            if(isTransformationApplied) {
                console.log(tl.loc("XDTTransformationsappliedsuccessfully"));
            }            
        }
    }

    if(variableSubstitutionFileFormat === "xml") {
        if(targetFiles.length == 0) { 
            xmlSubstitutionUtility.substituteAppSettingsVariables(folderPath, isFolderBasedDeployment);
        }
        else {            
            targetFiles.forEach(function(fileName) { 
                xmlSubstitutionUtility.substituteAppSettingsVariables(folderPath, isFolderBasedDeployment, fileName);
            });
        }
        console.log(tl.loc('XMLvariablesubstitutionappliedsuccessfully'));
    }

    if(variableSubstitutionFileFormat === "json") {
        // For Json variable substitution if no target files are specified file files matching **\*.json
        if(!targetFiles || targetFiles.length == 0) {
            targetFiles = ["**/*.json"];
        }
        jsonSubstitutionUtility.jsonVariableSubstitution(folderPath, targetFiles, true);
        console.log(tl.loc('JSONvariablesubstitutionappliedsuccessfully'));
    }
}