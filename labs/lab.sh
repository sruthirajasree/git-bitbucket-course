#!/usr/bin/env bash
# Git + Bitbucket practice lab. A local bare repo plays the role of Bitbucket (origin).
# Usage: lab.sh list | start <drill> | check <drill> | hint <drill> | clean
set -u
LAB="${LAB_HOME:-$HOME/git-sandbox}"; O="$LAB/origin.git"; W="$LAB/work"; T="$LAB/teammate"
export GIT_AUTHOR_NAME="Lab Learner" GIT_AUTHOR_EMAIL="learner@example.com" GIT_COMMITTER_NAME="Lab Learner" GIT_COMMITTER_EMAIL="learner@example.com"
g(){ git -C "$W" "$@"; }; t(){ git -C "$T" "$@"; }
say(){ printf '%s\n' "$*"; }
ok(){ printf '  PASS  %s\n' "$*"; }; no(){ printf '  FAIL  %s\n' "$*"; FAILED=1; }

commit_in(){ # repo file content msg
  local r="$1" f="$2" c="$3" m="$4"; mkdir -p "$(dirname "$r/$f")"; printf '%s\n' "$c" >"$r/$f"; git -C "$r" add "$f"; git -C "$r" commit -qm "$m"; }

base(){
  rm -rf "$LAB"; mkdir -p "$LAB"
  git init -q --bare -b staging "$O"
  git clone -q "$O" "$T" 2>/dev/null; t checkout -q -b staging 2>/dev/null
  t config user.name "Teammate"; t config user.email "mate@example.com"
  commit_in "$T" README.md "# demo service" "PROJ-1: initial import"
  printf 'TIMEOUT = 30\n\ndef main():\n    print("run")\n' >"$T/app.py"; t add app.py; t commit -qm "PROJ-2: add app"
  printf 'def parse(x):\n    return x.strip()\n' >"$T/parser.py"; t add parser.py; t commit -qm "PROJ-3: add parser"
  t push -q -u origin staging
  git clone -q "$O" "$W" 2>/dev/null; g config user.name "Lab Learner"; g config user.email "learner@example.com"
}
banner(){ say ""; say "Sandbox ready. Work in:  cd $W"; say "Goal: $1"; say "When done:  $0 check $2"; say "Stuck?     $0 hint $2"; say ""; }

drill_list(){ cat <<'L'
wrong-branch    committed on staging by mistake (unpushed)
amend           forgot a file in the last commit
rejected        push rejected: teammate pushed first
stash-pull      pull blocked by uncommitted changes
conflict-merge  resolve a merge conflict updating from staging
conflict-rebase resolve conflicts while rebasing onto staging
squash-wip      squash 5 WIP commits into 1
lost-commits    reset --hard ate 3 commits: recover them
detached        committed in detached HEAD: save the work
revert-pushed   a bad commit is on shared staging: undo safely
squash-cleanup  PR squash-merged: clean up the leftover branch
secret          committed a secret (unpushed): remove it
backport        copy a fix from staging to release/26.2
L
}

start_wrong-branch(){ base; commit_in "$W" feature.py "def feature(): pass" "PROJ-1234: start feature"; commit_in "$W" feature.py "def feature(): return 1" "PROJ-1234: finish feature"; banner "Both commits are on local staging. Put them on feature/PROJ-1234 and make staging match origin/staging again. Nothing pushed yet." wrong-branch; }
check_wrong-branch(){ g rev-parse -q --verify feature/PROJ-1234 >/dev/null && ok "branch feature/PROJ-1234 exists" || no "branch feature/PROJ-1234 missing"
  [ "$(g rev-list --count origin/staging..feature/PROJ-1234 2>/dev/null)" = 2 ] && ok "feature has your 2 commits" || no "feature branch must hold exactly your 2 commits"
  [ "$(g rev-parse staging)" = "$(g rev-parse origin/staging)" ] && ok "staging == origin/staging" || no "local staging still differs from origin/staging"; }
hint_wrong-branch(){ say "1) git switch -c feature/PROJ-1234   (new pointer at your commits)  2) git switch staging  3) git reset --hard origin/staging"; }

start_amend(){ base; g switch -q -c feature/PROJ-10-x; printf 'def a(): pass\n' >"$W/a.py"; printf 'def b(): pass\n' >"$W/b.py"; g add a.py; g commit -qm "PROJ-10: add a and b"; banner "Commit 'add a and b' only contains a.py. Add b.py to that SAME commit (no new commit)." amend; }
check_amend(){ g ls-tree -r --name-only HEAD | grep -qx b.py && ok "b.py is in HEAD commit" || no "b.py is not in the last commit"
  [ "$(g rev-list --count origin/staging..HEAD)" = 1 ] && ok "still exactly 1 commit" || no "expected exactly 1 commit on top of staging"; }
hint_amend(){ say "git add b.py && git commit --amend --no-edit"; }

start_rejected(){ base; g switch -q -c feature/PROJ-20-x; commit_in "$W" f1.py "x=1" "PROJ-20: first"; g push -q -u origin feature/PROJ-20-x
  t fetch -q; t switch -q -c feature/PROJ-20-x origin/feature/PROJ-20-x; commit_in "$T" teammate.py "y=2" "PROJ-20: teammate work"; t push -q
  commit_in "$W" f2.py "x=2" "PROJ-20: my second commit"; banner "Your 'git push' is rejected. Get both your commit and the teammate's commit onto origin/feature/PROJ-20-x without force-pushing." rejected; }
check_rejected(){ g fetch -q; l=$(g log origin/feature/PROJ-20-x --format=%s)
  echo "$l" | grep -q "teammate work" && echo "$l" | grep -q "my second commit" && ok "origin has both commits" || no "origin branch must contain teammate's AND your commit (push needed)"
  [ "$(g rev-parse HEAD)" = "$(g rev-parse origin/feature/PROJ-20-x)" ] && ok "local == origin" || no "local and origin differ"; }
hint_rejected(){ say "git pull --rebase   (or git pull --no-rebase), then git push. Do NOT use --force."; }

start_stash-pull(){ base; commit_in "$T" docs.md "v2 docs" "PROJ-30: docs"; printf '\n# my local notes\n' >>"$T/README.md"; t add README.md; t commit -qm "PROJ-31: readme"; t push -q
  printf 'TIMEOUT = 31\n\ndef main():\n    print("run")\n' >"$W/app.py"; printf '# local tweak\n' >>"$W/parser.py"; banner "You have uncommitted edits (parser.py, app.py). Pull the new remote commits WITHOUT losing your edits or committing them." stash-pull; }
check_stash-pull(){ g fetch -q; g merge-base --is-ancestor origin/staging HEAD && ok "has remote commits" || no "origin/staging not in your branch yet"
  g diff --quiet && no "your edits are gone" || ok "uncommitted edits preserved"
  [ -z "$(g stash list)" ] && ok "stash is empty (popped)" || no "stash still holds your changes (pop it)"; }
hint_stash-pull(){ say "git stash push -m wip && git pull --rebase && git stash pop"; }

mkconf(){ base; g switch -q -c feature/PROJ-40-x; printf 'TIMEOUT = 45\n\ndef main():\n    print("run")\n' >"$W/app.py"; g add app.py; g commit -qm "PROJ-40: raise timeout to 45"
  printf '\ndef retry():\n    return 3\n' >>"$W/app.py"; g add app.py; g commit -qm "PROJ-40: add retry"
  printf 'TIMEOUT = 60\n\ndef main():\n    print("run")\n\ndef log():\n    pass\n' >"$T/app.py"; t add app.py; t commit -qm "PROJ-41: timeout 60 and log helper"; t push -q; g fetch -q; }
start_conflict-merge(){ mkconf; banner "Update your branch with origin/staging by MERGING. Keep TIMEOUT = 45 and keep BOTH def retry() and def log()." conflict-merge; }
chk_app(){ grep -qE '^(<<<<<<<|=======|>>>>>>>)' "$W/app.py" && no "conflict markers still in app.py" || ok "no conflict markers"
  grep -q 'TIMEOUT = 45' "$W/app.py" && grep -q 'def retry' "$W/app.py" && grep -q 'def log' "$W/app.py" && ok "app.py has TIMEOUT=45, retry, log" || no "app.py must have TIMEOUT = 45, def retry and def log"
  g merge-base --is-ancestor origin/staging HEAD && ok "origin/staging included" || no "origin/staging not included yet"
  [ -z "$(g status --porcelain)" ] && ok "working tree clean" || no "uncommitted/unmerged changes remain"; }
check_conflict-merge(){ [ -f "$W/.git/MERGE_HEAD" ] && no "merge still in progress (commit it)"; chk_app; g log --merges --oneline origin/staging..HEAD | grep -q . && ok "merge commit present" || no "expected a merge commit"; }
hint_conflict-merge(){ say "git merge origin/staging -> edit app.py (remove markers, keep both sides' needs) -> git add app.py -> git commit"; }
start_conflict-rebase(){ mkconf; banner "REBASE your 2 commits onto origin/staging. Keep TIMEOUT = 45, retry() and log(). History must end up linear." conflict-rebase; }
check_conflict-rebase(){ { [ -d "$W/.git/rebase-merge" ] || [ -d "$W/.git/rebase-apply" ]; } && no "rebase still in progress (git rebase --continue)"; chk_app
  [ -z "$(g log --merges --oneline origin/staging..HEAD)" ] && ok "no merge commits (linear)" || no "found a merge commit; use rebase"
  [ "$(g rev-list --count origin/staging..HEAD)" = 2 ] && ok "your 2 commits replayed" || no "expected 2 commits on top of staging"; }
hint_conflict-rebase(){ say "git rebase origin/staging -> fix app.py -> git add app.py -> git rebase --continue (repeat if it stops again)"; }

start_squash-wip(){ base; g switch -q -c feature/PROJ-50-x; for i in 1 2 3 4 5; do printf 'step %s\n' $i >>"$W/work.txt"; g add work.txt; g commit -qm "wip $i"; done; banner "5 'wip' commits. Squash into ONE commit named 'PROJ-50: add work log', keeping all 5 lines of work.txt." squash-wip; }
check_squash-wip(){ [ "$(g rev-list --count origin/staging..HEAD)" = 1 ] && ok "exactly 1 commit" || no "need exactly 1 commit on top of staging"
  [ "$(wc -l <"$W/work.txt")" = 5 ] && ok "work.txt intact" || no "work.txt lost lines"
  g log -1 --format=%s | grep -q 'PROJ-50' && ok "message ok" || no "message must contain PROJ-50"; }
hint_squash-wip(){ say "git reset --soft origin/staging && git commit -m 'PROJ-50: add work log'   (or git rebase -i origin/staging)"; }

start_lost-commits(){ base; g switch -q -c feature/PROJ-77-x; for i in 1 2 3; do commit_in "$W" "step$i.txt" "s$i" "PROJ-77 step $i"; done; g reset -q --hard origin/staging; banner "You ran 'git reset --hard origin/staging' and your 3 commits vanished from git log. Bring them back on this branch." lost-commits; }
check_lost-commits(){ n=$(g log --format=%s | grep -c 'PROJ-77 step'); [ "$n" = 3 ] && ok "3 commits back in history" || no "found $n of 3 commits"; [ -f "$W/step3.txt" ] && ok "files restored" || no "step3.txt missing"; }
hint_lost-commits(){ say "git reflog  -> find the entry before the reset -> git reset --hard HEAD@{1}  (or the sha)"; }

start_detached(){ base; g checkout -q --detach HEAD; commit_in "$W" important.txt "do not lose" "PROJ-5 important"; banner "You are in detached HEAD and made a commit. Save it on a branch called rescue/important and be on that branch." detached; }
check_detached(){ [ "$(g branch --show-current)" = "rescue/important" ] && ok "on rescue/important" || no "HEAD must be on branch rescue/important"; g log -1 --format=%s | grep -q 'PROJ-5 important' && ok "commit saved" || no "commit not on branch"; }
hint_detached(){ say "git switch -c rescue/important   (do this BEFORE switching away)"; }

start_revert-pushed(){ base; commit_in "$T" parser.py "def parse(x): raise Exception" "PROJ-60: refactor parser"; t push -q; commit_in "$T" other.py "ok=1" "PROJ-61: unrelated good change"; t push -q; g pull -q; banner "Commit 'PROJ-60: refactor parser' on shared staging broke parser.py. Undo ONLY that commit with a new commit and push it. Keep the unrelated commit. No force-push." revert-pushed; }
check_revert-pushed(){ g fetch -q; git -C "$O" show staging:parser.py | grep -q 'strip' && ok "origin/staging parser restored" || no "origin/staging still has the bad parser (revert + push)"
  git -C "$O" show staging:other.py >/dev/null 2>&1 && ok "unrelated commit kept" || no "unrelated commit lost"
  git -C "$O" log staging --format=%s | grep -q 'refactor parser' && ok "history preserved (not rewritten)" || no "history was rewritten"; git -C "$O" log staging --format=%s | grep -qi '^Revert' && ok "revert commit pushed" || no "no revert commit on origin"; }
hint_revert-pushed(){ say "git log --oneline; git revert <sha-of-refactor-parser>; git push"; }

start_squash-cleanup(){ base; g switch -q -c feature/PROJ-99-x; for i in 1 2 3; do commit_in "$W" "f$i.txt" "$i" "PROJ-99 part $i"; done; g push -q -u origin feature/PROJ-99-x
  t pull -q; for i in 1 2 3; do printf '%s\n' $i >"$T/f$i.txt"; done; t add .; t commit -qm "PROJ-99: add feature (squash, PR #12)"; t push -q; banner "PR #12 was SQUASH-merged on Bitbucket. Update local staging, then delete the local and remote feature/PROJ-99-x branches. (git branch -d will refuse: know why.)" squash-cleanup; }
check_squash-cleanup(){ g fetch -q --prune; g switch -q staging 2>/dev/null; g merge-base --is-ancestor origin/staging staging && [ "$(g rev-parse staging)" = "$(g rev-parse origin/staging)" ] && ok "local staging up to date" || no "pull staging first"
  g rev-parse -q --verify feature/PROJ-99-x >/dev/null && no "local branch still exists" || ok "local branch deleted"
  git -C "$O" rev-parse -q --verify refs/heads/feature/PROJ-99-x >/dev/null && no "remote branch still exists" || ok "remote branch deleted"; }
hint_squash-cleanup(){ say "git switch staging; git pull; git branch -D feature/PROJ-99-x (squash hides ancestry); git push origin --delete feature/PROJ-99-x"; }

start_secret(){ base; g switch -q -c feature/PROJ-70-x; printf 'def connect(): pass\n' >"$W/db.py"; printf 'DB_PASSWORD=hunter2\n' >"$W/.env"; g add db.py .env; g commit -qm "PROJ-70: add db connect"; banner "The last commit (unpushed) accidentally includes .env with a password. Remove .env from the commit (keep db.py), ignore it in .gitignore, keep the file on disk." secret; }
check_secret(){ [ -z "$(g log HEAD --format=%H -S hunter2)" ] && ok "secret not in HEAD history" || no "secret still in a commit"
  g ls-tree -r --name-only HEAD | grep -qx db.py && ok "db.py kept" || no "db.py lost"; grep -qx '.env' "$W/.gitignore" 2>/dev/null && ok ".env ignored" || no ".env not in .gitignore"; [ -f "$W/.env" ] && ok ".env still on disk" || no ".env deleted from disk"
  say "  NOTE  In real life: also ROTATE the password. Assume anything committed is exposed."; }
hint_secret(){ say "git reset --soft HEAD~1; git restore --staged .env; echo .env >> .gitignore; git add db.py .gitignore; git commit -m ..."; }

start_backport(){ base; t switch -q -c release/26.2; t push -q -u origin release/26.2; t switch -q staging; printf 'def parse(x):\n    return (x or "").strip()\n' >"$T/parser.py"; t add parser.py; t commit -qm "PROJ-8: fix NPE in parser"; t push -q; g fetch -q; g switch -q -c release/26.2 origin/release/26.2; banner "The NPE fix commit lives on staging only. Copy it onto local release/26.2 (staying on that branch)." backport; }
check_backport(){ g log release/26.2 --format=%s | grep -q 'fix NPE' && ok "fix commit on release/26.2" || no "fix not on release/26.2"; g show release/26.2:parser.py | grep -q 'x or' && ok "parser.py fixed" || no "parser.py not fixed"
  [ "$(g rev-list --count origin/release/26.2..release/26.2)" = 1 ] && ok "exactly 1 new commit on release" || no "expected exactly 1 commit on top of origin/release/26.2"; }
hint_backport(){ say "git log origin/staging --oneline -3 -> copy sha -> (on release/26.2) git cherry-pick <sha>"; }

cmd="${1:-list}"; d="${2:-}"
case "$cmd" in
 list) drill_list;;
 start) type "start_$d" >/dev/null 2>&1 || { echo "unknown drill: $d"; drill_list; exit 1; }; "start_$d";;
 check) type "check_$d" >/dev/null 2>&1 || { echo "unknown drill"; exit 1; }; FAILED=0; say "Checking $d ..."; "check_$d"; [ "$FAILED" = 0 ] && say "ALL CHECKS PASSED. Nice work." || say "Not yet. Run 'git status' and re-read the goal; '$0 hint $d' if stuck.";;
 hint) "hint_$d";;
 clean) rm -rf "$LAB"; say "removed $LAB";;
 *) echo "usage: $0 list|start|check|hint|clean [drill]";;
esac
