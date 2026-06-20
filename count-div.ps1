$content = Get-Content 'C:\Users\Admin\Desktop\outsrc\quan-ly-lich-xe-ghep\components\schedule-list.tsx'
$slice = $content[1698..2170]
$opCount = 0
$clCount = 0
for ($i = 0; $i -lt $slice.Count; $i++) {
    $line = $slice[$i]
    $opens = [regex]::Matches($line, '<div\b')
    $closes = [regex]::Matches($line, '</div>')
    $selfClose = [regex]::Matches($line, '<div[^>]*/>')
    $realOpens = $opens.Count - $selfClose.Count
    $opCount += $realOpens
    $clCount += $closes.Count
}
Write-Output "Full range Opens: $opCount, Closes: $clCount, Diff: $($opCount - $clCount)"
