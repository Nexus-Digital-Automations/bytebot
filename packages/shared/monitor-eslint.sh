#\!/bin/bash
# Real-time ESLint monitoring script
while true; do
  current_time=$(date '+%H:%M:%S')
  security_count=$(timeout 5s npx eslint src/security/ 2>&1 | grep -c "error" || echo "0")
  services_count=$(timeout 5s npx eslint src/services/ 2>&1 | grep -c "error" || echo "0")
  total_count=$(($security_count + $services_count))
  
  echo "$current_time - Violations: $total_count (Security: $security_count, Services: $services_count)" >> eslint-monitoring-report.md
  
  if [ $total_count -eq 0 ]; then
    echo "$current_time - 🎉 ZERO VIOLATIONS ACHIEVED\!" >> eslint-monitoring-report.md
    break
  fi
  
  sleep 30
done
