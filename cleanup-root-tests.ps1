# Clean Code Cleanup Script
# Follows SOLID principles by separating test organization concerns

Write-Host "🧼 Starting Clean Code cleanup of root directory..." -ForegroundColor Green

# Define file categories for organized cleanup
$testFiles = @(
    "complete-service-worker-test.js",
    "direct-paste-test.js", 
    "edge-case-logic-test.js",
    "final-end-to-end-test.js",
    "final-pattern-test.js",
    "fixed-simple-test.js",
    "immediate-test.js",
    "iptorrents-test.js",
    "manual-storage-load-test.js",
    "path-matching-final-test.js",
    "pattern-matcher-tests.js",
    "pattern-normalize-test.js",
    "pattern-test.js",
    "quick-format-test.js",
    "run-pattern-tests.js",
    "temo-log-test.js",
    "test-blocking-reasons.js",
    "test-deny-blocking.js",
    "test-keyword-addition.js",
    "test-keyword-fix.js",
    "test-sync-functionality.js",
    "updated-pattern-test.js"
)

$debugFiles = @(
    "debug-deny-list.js",
    "debug-extension-storage.js", 
    "debug-keyword-blocking.js"
)

$experimentalFiles = @(
    "communication-test.html",
    "fixed-trace-init.js",
    "improved-wildcardToRegExp-fixed.js",
    "improved-wildcardToRegExp.js",
    "pattern-matcher.js",
    "service-worker-updates.js",
    "updated-block-function.js"
)

$htmlTestFiles = @(
    "debug-url-matching.html",
    "pattern-matching-test.html",
    "sync-diagnostics-debug.html",
    "sync-diagnostics.html", 
    "sync-status.html",
    "sync-test.html"
)

# Create archive directories following Single Responsibility Principle
$archiveBase = "archive\experimental-tests"
New-Item -ItemType Directory -Path "$archiveBase\root-tests" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveBase\debug-scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveBase\html-tests" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveBase\experimental" -Force | Out-Null

# Move files to organized archive (following DRY principle with function)
function Move-FilesToArchive {
    param(
        [string[]]$Files,
        [string]$DestinationPath,
        [string]$CategoryName
    )
    
    $moved = 0
    foreach ($file in $Files) {
        if (Test-Path $file) {
            Write-Host "📦 Archiving $CategoryName`: $file" -ForegroundColor Yellow
            Move-Item $file "$DestinationPath\$file" -Force
            $moved++
        }
    }
    return $moved
}

# Archive files by category
$testMoved = Move-FilesToArchive $testFiles "$archiveBase\root-tests" "test file"
$debugMoved = Move-FilesToArchive $debugFiles "$archiveBase\debug-scripts" "debug script" 
$expMoved = Move-FilesToArchive $experimentalFiles "$archiveBase\experimental" "experimental file"
$htmlMoved = Move-FilesToArchive $htmlTestFiles "$archiveBase\html-tests" "HTML test"

# Move the entire tests/ directory to archive as well
if (Test-Path "tests") {
    Write-Host "📦 Archiving entire tests/ directory..." -ForegroundColor Yellow
    Move-Item "tests" "$archiveBase\legacy-tests" -Force
    $testsDirMoved = 1
} else {
    $testsDirMoved = 0
}

# Clean up backup files (following YAGNI principle)
$backupFiles = Get-ChildItem -Filter "*.bak*" -Name
$backupMoved = 0
if ($backupFiles) {
    New-Item -ItemType Directory -Path "$archiveBase\backups" -Force | Out-Null
    foreach ($backup in $backupFiles) {
        Write-Host "📦 Archiving backup: $backup" -ForegroundColor Yellow
        Move-Item $backup "$archiveBase\backups\$backup" -Force
        $backupMoved++
    }
}

# Report results
$totalMoved = $testMoved + $debugMoved + $expMoved + $htmlMoved + $testsDirMoved + $backupMoved

Write-Host "`n✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  • Test files archived: $testMoved" -ForegroundColor White
Write-Host "  • Debug scripts archived: $debugMoved" -ForegroundColor White
Write-Host "  • Experimental files archived: $expMoved" -ForegroundColor White
Write-Host "  • HTML test files archived: $htmlMoved" -ForegroundColor White
Write-Host "  • Legacy tests/ directory: $testsDirMoved" -ForegroundColor White
Write-Host "  • Backup files archived: $backupMoved" -ForegroundColor White
Write-Host "  • Total files organized: $totalMoved" -ForegroundColor White

Write-Host "`n📁 Clean project structure now follows Clean Code principles:" -ForegroundColor Green
Write-Host "  • Root directory: Clean and focused" -ForegroundColor White
Write-Host "  • Tests: Organized in src/__tests__/" -ForegroundColor White  
Write-Host "  • Archive: Experimental files preserved in archive/" -ForegroundColor White

Write-Host "`n🚀 Ready for git commit!" -ForegroundColor Green
