document.addEventListener('DOMContentLoaded', () => {
  const memoList = document.getElementById('memoList');
  
  // 메모 목록 표시
  function displayMemos() {
    chrome.storage.local.get('memos', (result) => {
      const memos = result.memos || {};
      
      if (Object.keys(memos).length === 0) {
        memoList.innerHTML = '<div class="no-memos">등록된 메모가 없습니다.<br>보배드림에서 사용자 이름을 클릭하여 메모를 등록하세요.</div>';
        return;
      }
      
      memoList.innerHTML = '';
      
      Object.entries(memos).forEach(([userId, memoData]) => {
        const memoItem = document.createElement('div');
        memoItem.className = 'memo-item';
        memoItem.setAttribute('data-user-id', userId);
        memoItem.setAttribute('data-type', memoData.type || 'block');
        
        memoItem.innerHTML = `
          <div class="memo-header">
            <span class="memo-nickname">${memoData.nickname}</span>
            <div class="memo-actions">
              <button class="toggle-btn">+</button>
              <button class="edit-btn">수정</button>
              <button class="delete-btn">삭제</button>
            </div>
          </div>
          <div class="memo-content">${memoData.memo}</div>
          <div class="memo-detail">
            <textarea>${memoData.memo}</textarea>
            <div class="memo-detail-buttons">
              <button class="save-btn">저장</button>
              <button class="cancel-btn">취소</button>
            </div>
          </div>
        `;
        
        memoList.appendChild(memoItem);
        
        // 상세 보기 토글
        const toggleBtn = memoItem.querySelector('.toggle-btn');
        const memoDetail = memoItem.querySelector('.memo-detail');
        const memoContent = memoItem.querySelector('.memo-content');
        
        toggleBtn.addEventListener('click', () => {
          memoDetail.classList.toggle('show');
          memoContent.style.display = memoDetail.classList.contains('show') ? 'none' : 'block';
          toggleBtn.textContent = memoDetail.classList.contains('show') ? '-' : '+';
        });
        
        // 수정 버튼
        const editBtn = memoItem.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
          memoDetail.classList.add('show');
          memoContent.style.display = 'none';
          toggleBtn.textContent = '-';
        });
        
        // 저장 버튼
        const saveBtn = memoItem.querySelector('.save-btn');
        saveBtn.addEventListener('click', () => {
          const newMemo = memoItem.querySelector('textarea').value;
          chrome.storage.local.get('memos', (result) => {
            const memos = result.memos || {};
            memos[userId].memo = newMemo;
            chrome.storage.local.set({ memos }, () => {
              memoContent.textContent = newMemo;
              memoDetail.classList.remove('show');
              memoContent.style.display = 'block';
              toggleBtn.textContent = '+';
            });
          });
        });
        
        // 취소 버튼
        const cancelBtn = memoItem.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', () => {
          memoItem.querySelector('textarea').value = memoData.memo;
          memoDetail.classList.remove('show');
          memoContent.style.display = 'block';
          toggleBtn.textContent = '+';
        });
        
        // 삭제 버튼
        const deleteBtn = memoItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
          if (confirm('정말 삭제하시겠습니까?')) {
            chrome.storage.local.get('memos', (result) => {
              const memos = result.memos || {};
              delete memos[userId];
              chrome.storage.local.set({ memos }, () => {
                // 삭제 후 바로 메모 목록 갱신
                displayMemos();
                
                // content.js로 메시지 전송하여 게시물 리스트 갱신
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'refreshMemos',
                    userId: userId
                  });
                });
              });
            });
          }
        });
      });
    });
  }
  
  displayMemos();
}); 