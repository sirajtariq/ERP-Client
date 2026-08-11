!macro customUnInstall
  DetailPrint "Stopping running LenDen processes..."
  ExecWait 'taskkill /F /IM LenDen.exe /IM ERP_Backend.exe'
!macroend
