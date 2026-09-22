/**
 * GitBook & Fine-Shield Automated Rule Checking Engine
 * 
 * Evaluates submissions against Hack Club YSWS guidelines:
 * - Hard Blockers: Playable URL = Code URL, Disallowed hosts (Streamlit), Single-commit dump.
 * - Soft Warnings: Project name mismatch in Hackatime, Missing devlog, Hours discrepancy.
 */

import { SubmissionParams, PlayableValidation, GitHubRepoData, HackatimeProjectStats, RuleCheckResult } from './types';

export function evaluateSubmissionRules(
  params: SubmissionParams,
  playableValidation: PlayableValidation,
  repoData: Partial<GitHubRepoData>,
  hackatimeData: Partial<HackatimeProjectStats>
): RuleCheckResult[] {
  const results: RuleCheckResult[] = [];

  // 1. Playable URL vs Code URL Blocker (GitBook Rule #10)
  if (playableValidation.isCodeDuplicate) {
    results.push({
      id: 'rule-playable-code-duplicate',
      title: 'Playable URL is Source Code',
      severity: 'blocker',
      message: 'Playable URL is identical to the GitHub repository URL.',
      detail: 'GitBook Rule #10 explicitly requires a live deployment, interactive site, or demo video (for CLI/scripts). Source code repository is not an acceptable playable URL.'
    });
  } else if (!params.playableUrl) {
    results.push({
      id: 'rule-playable-missing',
      title: 'Missing Playable URL',
      severity: 'blocker',
      message: 'No playable URL or demo video was provided.',
      detail: 'Every submission requires a functioning demo link or video demonstration.'
    });
  } else {
    results.push({
      id: 'rule-playable-valid',
      title: 'Playable URL Provided',
      severity: 'pass',
      message: 'Playable URL points to a standalone demo or deployment.'
    });
  }

  // 2. Prohibited Host / Streamlit Check
  if (playableValidation.isProhibitedHost) {
    results.push({
      id: 'rule-prohibited-host',
      title: 'Disallowed Hosting Platform',
      severity: 'blocker',
      message: playableValidation.prohibitedReason || 'Platform is prohibited under Fine-Shield guidelines.',
      detail: 'Streamlit and ephemeral local hosts require manual HQ pre-approval before grant distribution.'
    });
  }

  // 3. Commit Iteration Check (GitHub)
  if (repoData.commits && repoData.commits.length > 0) {
    if (repoData.commits.length === 1) {
      results.push({
        id: 'rule-single-commit',
        title: 'Single Commit Repository',
        severity: 'warning',
        message: 'Repository has only 1 commit ("Initial commit" / code dump).',
        detail: 'Check Hackatime timestamps or timelapse to verify whether code was developed organically or imported from an external source.'
      });
    } else {
      results.push({
        id: 'rule-iterative-commits',
        title: 'Iterative Git History',
        severity: 'pass',
        message: `Verified ${repoData.commits.length} commits in history showing progressive development.`
      });
    }
  }

  // 4. Hackatime Project Matching Check
  if (params.project && hackatimeData.projects && hackatimeData.projects.length > 0) {
    const cleanSubmittedProj = params.project.trim().toLowerCase();
    const hasMatch = hackatimeData.projects.some(p => p.toLowerCase() === cleanSubmittedProj);
    
    if (hasMatch) {
      results.push({
        id: 'rule-hackatime-match',
        title: 'Hackatime Project Verified',
        severity: 'pass',
        message: `Project '${params.project}' found in user's active Hackatime heartbeat list.`
      });
    } else {
      // Check if the repo name exists in projects instead
      const repoName = repoData.repo?.toLowerCase() || '';
      const hasRepoInProjects = repoName && hackatimeData.projects.some(p => p.toLowerCase().includes(repoName));

      results.push({
        id: 'rule-hackatime-project-mismatch',
        title: 'Project Name Mismatch',
        severity: 'warning',
        message: `Submitted project name '${params.project}' not found in Hackatime projects list.`,
        detail: hasRepoInProjects 
          ? `Submitter has '${repoName}' in their Hackatime projects list. They may have typed '${params.project}' by mistake.`
          : `Active projects found: ${hackatimeData.projects.slice(0, 5).join(', ')}...`
      });
    }
  }

  // 5. Hardware Track Lapse Check
  if (params.track === 'hardware') {
    if (!params.lapseLinks || !params.lapseLinks.trim()) {
      results.push({
        id: 'rule-hardware-missing-lapse',
        title: 'Missing Timelapse / Devlog',
        severity: 'blocker',
        message: 'Hardware track submissions require valid Lapse recording or devlog.',
        detail: 'No timelapse or build documentation link provided in lapse field.'
      });
    } else {
      results.push({
        id: 'rule-hardware-lapse-present',
        title: 'Hardware Build Log Provided',
        severity: 'pass',
        message: 'Lapse / devlog links detected in submission.'
      });
    }
  }

  // 6. Python / CLI Script Demo Video Check
  const isPythonCli = (repoData.files || []).some(f => f.name.endsWith('.py')) && 
                      !(repoData.files || []).some(f => f.name.includes('html') || f.name.includes('vite') || f.name.includes('next'));
  if (isPythonCli && playableValidation.isCodeDuplicate) {
    results.push({
      id: 'rule-cli-video-needed',
      title: 'Python CLI Demo Video Required',
      severity: 'warning',
      message: 'This appears to be a Python command-line utility.',
      detail: 'For terminal/CLI applications that cannot run in a browser, submitters must provide a screen recording or asciinema demo showing it running.'
    });
  }

  return results;
}
