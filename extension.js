const vscode = require('vscode');
const axios = require('axios');

async function getCodeforcesSubmissions(handle) {
    const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&count=5`);
    return response.data.result;
}

async function changeStatusBarColor(themeName) {
    const themeConfig = vscode.workspace.getConfiguration('workbench');
    await themeConfig.update('colorTheme', themeName, vscode.ConfigurationTarget.Global);
}



async function getHandle() {
    const config = vscode.workspace.getConfiguration('codeforces-notify');
    let handle = config.get('handle');
  
    if (!handle) {
      handle = await vscode.window.showInputBox({
        prompt: 'Please enter your Codeforces handle',
        ignoreFocusOut: true,
      });
  
      if (handle) {
        await config.update('handle', handle, vscode.ConfigurationTarget.Global);
      } else {
        vscode.window.showErrorMessage('Codeforces handle is required for the extension to work');
      }
    }
  
    return handle;
}

async function activate(context) {
    let lastSubmissionId = null;
    let running=false;

    cfh=await getHandle();
                    
    async function checkSubmissions() {
        try {
            
            let submissions = await getCodeforcesSubmissions(cfh);
            if (submissions.length === 0) {
                return;
            }

            let latestSubmission = submissions[0];
            if (lastSubmissionId === null) {
                lastSubmissionId = latestSubmission.id;
            }else{    
                if (latestSubmission.verdict !== 'TESTING') {
                    if(lastSubmissionId !== latestSubmission.id){ 
                       lastSubmissionId = latestSubmission.id;
                        let verdict = latestSubmission.verdict;
                        vscode.window.showInformationMessage(`${latestSubmission.problem.index}-${latestSubmission.problem.name}: ${verdict}`);
                    }
                }
                
            }


        } catch (error) {
            console.error('Failed to fetch Codeforces submissions:', error);
        }
    }

    const interval = setInterval(checkSubmissions, 500); 

    context.subscriptions.push(vscode.Disposable.from({ dispose: () => clearInterval(interval) }));
}


exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate
};