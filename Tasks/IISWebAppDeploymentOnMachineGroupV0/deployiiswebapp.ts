﻿import tl = require('vsts-task-lib/task');
import path = require('path');
import fs = require('fs');

var msDeploy = require('webdeployment-common/deployusingmsdeploy.js');
var utility = require('webdeployment-common/utility.js');
var fileTransformationsUtility = require('webdeployment-common/fileTransformationsUtility.js');

async function run()
{
	try
	{
		tl.setResourcePath(path.join( __dirname, 'task.json'));
		var webSiteName: string = tl.getInput('WebSiteName', true);
		var configDeployName: string = tl.getInput('ConfigDeployName', true);
		var virtualApplication: string = tl.getInput('VirtualApplication', false);
		var webDeployPkg: string = tl.getPathInput('Package', true);
		var setParametersFile: string = tl.getPathInput('SetParametersFile', false);
		var removeAdditionalFilesFlag: boolean = tl.getBoolInput('RemoveAdditionalFilesFlag', false);
		var excludeFilesFromAppDataFlag: boolean = tl.getBoolInput('ExcludeFilesFromAppDataFlag', false);
		var takeAppOfflineFlag: boolean = tl.getBoolInput('TakeAppOfflineFlag', false);
		var additionalArguments: string = tl.getInput('AdditionalArguments', false);
		var xmlTransformation: boolean = tl.getBoolInput('XmlTransformation', false);
		var JSONFiles = tl.getDelimitedInput('JSONFiles', '\n', false);
		var xmlVariableSubstitution: boolean = tl.getBoolInput('XmlVariableSubstitution', false);		
		var availableWebPackages = utility.findfiles(webDeployPkg);
		var tempPackagePath = null;
		
		if(virtualApplication == 'null'){
			virtualApplication = null;
		}

		if(availableWebPackages.length == 0)
		{
			throw new Error(tl.loc('Nopackagefoundwithspecifiedpattern'));
		}

		if(availableWebPackages.length > 1)
		{
			throw new Error(tl.loc('MorethanonepackagematchedwithspecifiedpatternPleaserestrainthesearchpattern'));
		}
		webDeployPkg = availableWebPackages[0];

		var isFolderBasedDeployment = await utility.isInputPkgIsFolder(webDeployPkg);

        if ( JSONFiles.length != 0 || xmlTransformation || xmlVariableSubstitution ) {

            var folderPath = await utility.generateTemporaryFolderForDeployment(isFolderBasedDeployment, webDeployPkg);
			var isMSBuildPackage = !isFolderBasedDeployment && await utility.isMSDeployPackage(webDeployPkg);
            fileTransformationsUtility.fileTransformations(isFolderBasedDeployment, JSONFiles, xmlTransformation, xmlVariableSubstitution, folderPath, isMSBuildPackage, configDeployName);
            var output = await utility.archiveFolderForDeployment(isFolderBasedDeployment, folderPath);
            tempPackagePath = output.tempPackagePath;
            webDeployPkg = output.webDeployPkg;
		}		
		
		await msDeploy.DeployUsingMSDeploy(webDeployPkg, webSiteName, null, removeAdditionalFilesFlag,
                        excludeFilesFromAppDataFlag, takeAppOfflineFlag, virtualApplication, setParametersFile,
                        additionalArguments, isFolderBasedDeployment, true);
        
	}
	catch(error)
	{
		tl.setResult(tl.TaskResult.Failed,error);
	}
	
}
run();