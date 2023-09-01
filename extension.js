const vscode = require('vscode');
const axios = require('axios');

let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Center, 100);

async function getCodeforcesSubmissions(handle) {
    const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&count=5`);
    return response.data.result;
}

async function getContestProblems(contestId, handle) {
    const response = await axios.get(`https://codeforces.com/api/contest.status?contestId=${contestId}&handle=${handle}&count=500`);
    return response.data.result;
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
    let handle = await getHandle();

    async function checkSubmissions() {
        try {
            const submissions = await getCodeforcesSubmissions(handle);
            if (submissions.length === 0) return;

            const latestSubmission = submissions[0];

            if (lastSubmissionId === null) {
                lastSubmissionId = latestSubmission.id;
            } else if (latestSubmission.id !== lastSubmissionId) {
                lastSubmissionId = latestSubmission.id;

                if (latestSubmission.verdict !== 'TESTING') {
                    const verdict = latestSubmission.verdict;
                    vscode.window.showInformationMessage(`${latestSubmission.problem.index}-${latestSubmission.problem.name}: ${verdict}`);
                }
            }

        } catch (error) {
            console.error('Failed to check submissions:', error);
        }
    }

    async function updateStatusBar() {
        try {
            const submissions = await getCodeforcesSubmissions(handle);
            if (submissions.length === 0) return;

            const latestSubmission = submissions[0];
            const currentTime = Math.floor(new Date().getTime() / 1000);

            if (currentTime - latestSubmission.creationTimeSeconds <= 14400) {
                const contestId = latestSubmission.problem.contestId;
                const contestProblems = await getContestProblems(contestId, handle);
                
                let problemStatus = {};

                for (let sub of contestProblems) {
                    const index = sub.problem.index;
                    problemStatus[index] = problemStatus[index] || '⚪';  // Default to white

                    if (sub.verdict === "OK") {
                        problemStatus[index] = '✔️';  // Solved
                    } else {
                        if(problemStatus[index] != '✔️')
                            problemStatus[index] = '❌';  // Incorrect
                    }
                }

                const sortedKeys = Object.keys(problemStatus).sort();
                const statusBarText = `Contest ${contestId}: ` + sortedKeys.map(k => `${k}: ${problemStatus[k]}`).join(' | ');

                statusBarItem.text = statusBarText;
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }

        } catch (error) {
            console.error('Failed to update status bar:', error);
        }
    }
    
    let checkInProgress = false;
    const interval = setInterval(async () => {
        if (!checkInProgress) {
            checkInProgress = true;
            await checkSubmissions();
            setTimeout(async () => {
                await updateStatusBar();
                checkInProgress = false;
            }, 2000);
        }
    }, 4000);

    context.subscriptions.push(vscode.Disposable.from({ dispose: () => clearInterval(interval) }));
    context.subscriptions.push(statusBarItem);
}

exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
