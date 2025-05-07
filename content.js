// 사용자 메모를 저장할 chrome.storage.local 사용
function saveMemo(userId, userName, memo, memoType, blockType) {
  console.log('메모 저장 시도:', userId, userName, memo, memoType, blockType);
  
  chrome.storage.local.get('memos', (result) => {
    const memos = result.memos || {};
    const currentMemo = memos[userId];
    
    // 기존 메모가 있고 별명이 변경된 경우
    if (currentMemo && currentMemo.nickname !== userName) {
      const oldNickname = currentMemo.nickname;
      const timestamp = new Date().toLocaleString();
      const nameChangeHistory = `\n\n[${timestamp}] 별명 변경: ${oldNickname} > ${userName}`;
      
      memos[userId] = {
        nickname: userName,
        memo: currentMemo.memo + nameChangeHistory,
        type: memoType,
        blockType: blockType
      };
    } else {
      memos[userId] = {
        nickname: userName,
        memo: memo,
        type: memoType,
        blockType: blockType
      };
    }
    
    chrome.storage.local.set({ memos }, () => {
      console.log('메모 저장 완료:', memos);
      highlightUserPosts(userId);
      
      // 메모 저장 후 메시지 전송
      chrome.runtime.sendMessage({
        action: 'refreshMemos',
        userId: userId
      });
    });
  });
}

// 메모 모달 표시
function showMemoModal(userId, userName) {
  const modal = document.createElement('div');
  modal.className = 'memo-modal';
  modal.innerHTML = `
    <div class="memo-modal-content">
      <h3>${userName}님의 메모</h3>
      <div class="memo-type">
        <label>
          <input type="radio" name="memoType" value="recommend" checked>
          추천
        </label>
        <label>
          <input type="radio" name="memoType" value="block">
          차단
        </label>
      </div>
      <div class="block-options" style="display: none;">
        <label>
          <input type="radio" name="blockType" value="hide" checked>
          게시물 숨기기
        </label>
        <label>
          <input type="radio" name="blockType" value="strike">
          취소선으로 표시
        </label>
      </div>
      <textarea id="memoText" placeholder="메모를 입력하세요"></textarea>
      <div class="memo-buttons">
        <button id="saveMemo">저장</button>
        <button id="cancelMemo">취소</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 기존 메모 불러오기
  chrome.storage.local.get('memos', (result) => {
    const memos = result.memos || {};
    if (memos[userId]) {
      document.getElementById('memoText').value = memos[userId].memo;
      const memoType = memos[userId].type || 'recommend';
      document.querySelector(`input[name="memoType"][value="${memoType}"]`).checked = true;
      
      if (memoType === 'block') {
        document.querySelector('.block-options').style.display = 'block';
        const blockType = memos[userId].blockType || 'hide';
        document.querySelector(`input[name="blockType"][value="${blockType}"]`).checked = true;
      }
    }
  });

  // 차단 옵션 토글
  const memoTypeInputs = modal.querySelectorAll('input[name="memoType"]');
  memoTypeInputs.forEach(input => {
    input.addEventListener('change', () => {
      const blockOptions = modal.querySelector('.block-options');
      blockOptions.style.display = input.value === 'block' ? 'block' : 'none';
    });
  });

  // 저장 버튼 이벤트
  document.getElementById('saveMemo').onclick = () => {
    const memo = document.getElementById('memoText').value;
    const memoType = document.querySelector('input[name="memoType"]:checked').value;
    const blockType = memoType === 'block' ? document.querySelector('input[name="blockType"]:checked').value : null;
    
    saveMemo(userId, userName, memo, memoType, blockType);
    document.body.removeChild(modal);
  };

  // 취소 버튼 이벤트
  document.getElementById('cancelMemo').onclick = () => {
    document.body.removeChild(modal);
  };
}

// 메모가 있는 사용자의 게시물 강조 표시
function highlightUserPosts(userId) {
  console.log('게시물 하이라이트 시도:', userId);
  const posts = document.querySelectorAll('#boardlist > tbody > tr');
  const currentUrl = window.location.href;
  
  chrome.storage.local.get('memos', (result) => {
    const memos = result.memos || {};
    const memoData = memos[userId];
    
    if (memoData) {
      posts.forEach(post => {
        const userLink = post.querySelector('span.author');
        if (userLink) {
          const onclick = userLink.getAttribute('onclick');
          if (onclick) {
            const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
            if (match && match[1] === userId) {
              let titleCell, number, sbj, nic, ct;
              
              if (currentUrl.includes('view?code=best')) {
                number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
                titleCell = post.querySelector('td:nth-child(3)');
                nic = post.querySelector('td:nth-child(4) span.author')?.textContent?.trim();
                ct = post.querySelector('td.count')?.textContent?.trim();
              } else if (currentUrl.includes('view?code=strange')) {
                number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
                titleCell = post.querySelector('td:nth-child(2)');
                nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
                ct = post.querySelector('td.count')?.textContent?.trim();
              } else if (currentUrl.includes('list?code=best')) {
                titleCell = post.querySelector('td:nth-child(2)');
                nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
                const titleLink = titleCell.querySelector('a');
                if (titleLink) {
                  const href = titleLink.getAttribute('href');
                  const match = href.match(/No=(\d+)/);
                  if (match) {
                    number = match[1];
                  }
                }
                ct = post.querySelector('td.count')?.textContent?.trim();
              } else if (currentUrl.includes('list?code=strange')) {
                number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
                titleCell = post.querySelector('td:nth-child(2)');
                nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
                ct = post.querySelector('td.count')?.textContent?.trim();
              } else {
                number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
                titleCell = post.querySelector('td:nth-child(2)');
                nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
                ct = post.querySelector('td.count')?.textContent?.trim();
              }
              
              if (titleCell) {
                // 기존 클래스 제거
                titleCell.classList.remove('has-memo-title', 'blocked-title', 'recommended-title');
                post.classList.remove('hidden-post');
                
                // 메모 컨테이너 제거
                const memoContainer = titleCell.querySelector('.memo-container');
                if (memoContainer) {
                  memoContainer.remove();
                }
                
                // 새로운 클래스 추가
                titleCell.classList.add('has-memo-title');
                if (memoData.type === 'block') {
                  titleCell.classList.add('blocked-title');
                  if (memoData.blockType === 'hide') {
                    post.classList.add('hidden-post');
                    return;
                  }
                } else {
                  titleCell.classList.add('recommended-title');
                }
                
                if (!titleCell.querySelector('.memo-container')) {
                  const container = document.createElement('span');
                  container.className = 'memo-container';
                  container.style.marginRight = '5px';

                  const memoIndicator = document.createElement('span');
                  memoIndicator.className = 'memo-indicator';
                  memoIndicator.innerHTML = `📝 <span class="memo-tooltip">${memoData.memo}</span>`;
                  
                  const actionButton = document.createElement('span');
                  actionButton.className = memoData.type === 'block' ? 'report-button' : 'recommend-button';
                  actionButton.innerHTML = memoData.type === 'block' ? '🚨' : '👍';
                  actionButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (currentUrl.includes('view') && number === '현재글') {
                      sbj = titleCell.querySelector('strong')?.textContent?.trim();
                    } else {
                      sbj = titleCell.querySelector('a')?.getAttribute('title') || titleCell.querySelector('a')?.textContent?.trim();
                    }
                    
                    if (number && sbj && nic) {
                      if (memoData.type === 'block') {
                        const url = `/board/bulletin/report_info.php?gubun=본문&code=strange&number=${number}&title=${encodeURIComponent(sbj)}&nic=${encodeURIComponent(nic)}`;
                        window.open(url, '', 'width=525,height=575');
                      } else {
                        // 추천 기능 구현
                        const jsonOutput = {};
                        const searchParams = new URLSearchParams(location.href.split("?")[1]);
                        for(const [key,value] of searchParams){
                            const allValues = searchParams.getAll(key);
                            if (allValues.length > 1) {
                                jsonOutput[key] = allValues;
                            } else {
                                jsonOutput[key] = value;
                            }    
                        }                        
                        // Assume jsonOutput, number, ct, strPublic, strMsg2, login_go are defined in the scope

                        // Prepare the data for a POST request.
                        // jQuery's data object with type: "post" typically sends data as
                        // application/x-www-form-urlencoded. We can use URLSearchParams for this.
                        const postData = new URLSearchParams();
                        postData.append("code", jsonOutput.code);
                        postData.append("No", number);
                        postData.append("score", 1);
                        postData.append("public", 'Public');
                        postData.append("count", ct);

                        // beforeSend equivalent: code before the fetch call
                        // (no specific beforeSend function in fetch, just put logic here)
                        // console.log("Sending fetch request..."); // Example beforeSend logic

                        fetch("/mobile/proc/set_recommand.php", {
                            method: "POST", // Same as jQuery type:"post"
                            headers: {
                                // Important: set the Content-Type header for form data
                                "Content-Type": "application/x-www-form-urlencoded",
                                // You might need other headers if your server expects them,
                                // such as 'X-Requested-With': 'XMLHttpRequest' if the server checks for it,
                                // but usually not necessary for simple forms.
                            },
                            body: postData, // The data to be sent in the request body
                        })
                        .then(response => {
                            // In fetch, non-2xx HTTP status codes do NOT throw an error.
                            // We need to check the response.ok property (true for 2xx status codes)
                            // or check response.status manually.
                            if (!response.ok) {
                                // If response is not OK (e.g., 404, 500), throw an error to go to the catch block
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            // Request was successful (status is 2xx), now get the response data as text
                            return response.text(); // Same as jQuery dataType: "text"
                        })
                        .then(data => {
                            // success equivalent: handle the response data here
                            // The logic from your jQuery success function goes here
                            let rescd = data.substring(0, 2);

                            if (rescd == '10') {
                                window.alert('게시판 정보가 없습니다.');
                            } else if (rescd == '12') {
                                window.alert('로그인 후 이용해 주세요.');
                                login_go();
                                // return; // No need to return here in async promise chain
                            } else if (rescd == '20') {
                                window.alert('자신의 글을 추천 할 수 없습니다.');
                            } else if (rescd == '30') {
                                window.alert('이미 추천을 하였습니다.');
                            } else if (rescd == "31") {
                                window.alert('이미 반대를 하였습니다.');
                            } else if (rescd == "32") {
                                window.alert('이미 중복을 하였습니다.');
                            } else if (rescd == '66') {
                                window.alert('불량회원으로 지정되어서 추천하기 권한이 제한되었습니다.\n관리자에게 문의하시기 바랍니다.');
                            } else if (rescd == "90") {
                                // Assuming $ is jQuery is available and #temp... elements exist
                                $("#temp" + strPublic).text(data.substring(2));
                            } else if (rescd == "95") {
                                window.alert('커뮤니티 글쓰기 인증된 회원만 ' + strMsg2 + ' 가능합니다.');
                            } else if (rescd == '99') {
                                // Assuming $ is jQuery is available and #temp... elements exist
                                $("#temp" + strPublic).text(data.substring(2));
                            } else {
                                window.alert('추천 완료.');// Handle other cases
                            }

                            // return; // No need to return here in async promise chain
                        })
                        .catch(error => {
                            // error equivalent: handle network errors or errors thrown in the then block
                            console.error('Fetch error:', error);
                            // The original error function was empty, but you could add logic here
                        })
                        .finally(() => {
                            // complete equivalent: runs after the fetch is complete, regardless of success or error
                            // console.log("Fetch request complete."); // Example complete logic
                            // The original complete function was empty, so nothing specific is needed unless you want to add something
                        });
                      }
                    }
                  };

                  container.appendChild(memoIndicator);
                  container.appendChild(actionButton);
                  titleCell.insertBefore(container, titleCell.firstChild);
                }
              }
            }
          }
        }
      });
    }
  });
}

// 페이지 로드 시 메모가 있는 게시물 강조 표시
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 이벤트 발생');
  checkAllMemos();
  observePageChanges();
  
  // 뷰 페이지인 경우 댓글 처리
  if (window.location.href.includes('view')) {
    console.log('뷰 페이지 감지, 댓글 처리 시작');
    debouncedProcessComments();
  }
});

// 모든 메모를 체크하고 표시하는 함수
function checkAllMemos() {
  console.log('모든 메모 체크 시작');
  chrome.storage.local.get('memos', (result) => {
    const memos = result.memos || {};
    console.log('찾은 메모:', memos);
    Object.keys(memos).forEach(userId => {
      highlightUserPosts(userId);
    });
  });
}

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
  #submenusel.with-memo {
    height: auto !important;
  }
  .memo-indicator {
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    position: relative;
  }
  .memo-indicator .memo-tooltip {
    display: none;
    position: absolute;
    background: #333;
    color: #fff;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  .memo-indicator .memo-tooltip::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 5px 0;
    border-style: solid;
    border-color: #333 transparent transparent;
  }
  .memo-indicator:hover .memo-tooltip {
    display: block;
  }
  .blocked-title a {
    color: #ff4444 !important;
    text-decoration: line-through !important;
    pointer-events: none !important;
    cursor: default !important;
  }
  .blocked-title strong {
    color: #ff4444 !important;
    text-decoration: line-through !important;
  }
  .recommended-title a {
    color: #4CAF50 !important;
    font-weight: bold !important;
  }
  .recommended-title strong {
    color: #4CAF50 !important;
    font-weight: bold !important;
  }
  .report-button {
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    color: #ff4444;
    font-size: 14px;
  }
  .recommend-button {
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    color: #4CAF50;
    font-size: 14px;
  }
  .report-button:hover, .recommend-button:hover {
    opacity: 0.8;
  }
  .memo-type {
    margin-bottom: 10px;
  }
  .memo-type label {
    margin-right: 15px;
    cursor: pointer;
  }
  .memo-type input[type="radio"] {
    margin-right: 5px;
  }
  .blocked-comment {
    display: none;
    background-color: #fff5f5;
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
  }
  .show-blocked-comments {
    display: block;
    text-align: center;
    margin: 10px 0;
    padding: 5px;
    background-color: #f0f0f0;
    cursor: pointer;
    border-radius: 4px;
  }
  .show-blocked-comments:hover {
    background-color: #e0e0e0;
  }
  .hidden-post {
    display: none !important;
  }
  .block-options {
    margin: 10px 0;
  }
  .block-options label {
    display: block;
    margin: 5px 0;
    cursor: pointer;
  }
  .block-options input[type="radio"] {
    margin-right: 5px;
  }
`;
document.head.appendChild(style);

// 컨텍스트 메뉴에 메모 버튼 추가
function addMemoButton(userId, userName) {
  console.log('메모 버튼 추가 시도:', userId, userName);
  
  const checkMenu = setInterval(() => {
    const menu = document.getElementById('submenusel');
    if (menu) {
      clearInterval(checkMenu);
      console.log('메뉴 찾음:', menu);
      
      const menuList = menu.querySelector('ol');
      if (!menuList) {
        console.log('메뉴 리스트를 찾을 수 없음');
        return;
      }

      // 이미 메모 버튼이 있는지 확인
      if (!menuList.querySelector('.memo-button')) {
        // 기존 메뉴 아이템 저장
        const existingItems = Array.from(menuList.children);
        
        // 메뉴 리스트 초기화 방지
        if (existingItems.length === 3) {
          // 회원차단 메뉴 아이템 생성
          const blockItem = document.createElement('li');
                blockItem.setAttribute("style","width:130px;text-align:left;margin:5px 0px;padding-left:10px;color:4c4c4c;");
          const blockLink = document.createElement('a');
          blockLink.href = '#';
          blockLink.className = 'submenu_item';
          blockLink.textContent = '회원차단';
          blockLink.onclick = function(e) {
            e.preventDefault();
            if (typeof user_block === 'function') {
              user_block(userId);
            }
          };
          blockItem.appendChild(blockLink);
          menuList.appendChild(blockItem);
        }

        const menuItem = document.createElement('li');
        const memoButton = document.createElement('a');
        memoButton.href = '#';
        memoButton.className = 'submenu_item memo-button';
        memoButton.textContent = '메모하기';
        memoButton.onclick = (e) => {
          e.preventDefault();
          showMemoModal(userId, userName);
        };

        menuItem.appendChild(memoButton);
        menuList.appendChild(menuItem);
        
        // 메뉴가 완전히 표시된 후 클래스 추가
        setTimeout(() => {
          if (menu.style.display === 'block') {
            menu.classList.add('with-memo');
            console.log('메뉴 높이 조정 클래스 추가 완료');
          }
        }, 100);
        
        console.log('메모 버튼 추가 완료');
      }
    }
  }, 100);
}

// MutationObserver를 사용하여 동적으로 추가되는 컨텍스트 메뉴 감지
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.id === 'submenusel') {
          console.log('submenusel 메뉴 감지됨');
          
          // 메뉴 리스트 확인
          const menuList = node.querySelector('ol');
          if (!menuList) return;

          // 회원차단 메뉴가 없으면 추가
          if (!menuList.querySelector('.submenu_item')) {
            // 클릭된 링크 찾기
            const clickedLink = document.querySelector('span.author[data-clicked="true"]');
            if (clickedLink) {
              const onclick = clickedLink.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
                if (match) {
                  const userId = match[1];
                  
                  // 회원차단 메뉴 아이템 생성
                  const blockItem = document.createElement('li');
                        blockItem.setAttribute("style","width:130px;text-align:left;margin:5px 0px;padding-left:10px;color:4c4c4c;");
                  const blockLink = document.createElement('a');
                  blockLink.href = '#';
                  blockLink.className = 'submenu_item';
                  blockLink.textContent = '회원차단';
                  blockLink.onclick = function(e) {
                    e.preventDefault();
                    if (typeof user_block === 'function') {
                      user_block(userId);
                    }
                  };
                  blockItem.appendChild(blockLink);
                  menuList.appendChild(blockItem);
                }
              }
            }
          }
        }
      });
    }
  });
});

// 사용자 링크 클릭 이벤트 감지
function handleUserLinkClick(e) {
  console.log('클릭 이벤트 발생');
  
  // 클릭된 요소가 span.author인지 확인
  let target = e.target;
  while (target && !target.classList.contains('author')) {
    target = target.parentElement;
  }
  
  if (!target) return;
  
  // 이전에 클릭된 요소의 data-clicked 속성 제거
  const prevClicked = document.querySelector('span.author[data-clicked="true"]');
  if (prevClicked) {
    prevClicked.removeAttribute('data-clicked');
  }
  
  // 현재 클릭된 요소에 data-clicked 속성 추가
  target.setAttribute('data-clicked', 'true');
  
  console.log('클릭된 요소:', target);
  console.log('onclick 속성:', target.getAttribute('onclick'));
  
  // onclick 속성에서 사용자 정보 추출
  const onclick = target.getAttribute('onclick');
  if (onclick && onclick.includes('submenu_show')) {
    const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
    if (match) {
      const userId = match[1];
      const userName = match[2];
      console.log('사용자 정보 추출:', userId, userName);
      setTimeout(() => addMemoButton(userId, userName), 100);
    }
  }
}

// 이벤트 리스너 등록
document.addEventListener('click', handleUserLinkClick);

// 페이지 변경을 감지하는 함수
function observePageChanges() {
  console.log('페이지 변경 감지 시작');
  
  // 게시판 목록 변경 감지
  const boardlist = document.getElementById('boardlist');
  if (boardlist) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          console.log('게시판 내용 변경 감지');
          checkAllMemos();
        }
      });
    });

    observer.observe(boardlist, {
      childList: true,
      subtree: true
    });
  }

  // URL 변경 감지
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL 변경 감지:', currentUrl);
      
      if (currentUrl.includes('view')) {
        console.log('뷰 페이지로 변경, 댓글 처리 시작');
        debouncedProcessComments();
      }
    }
  }).observe(document, { subtree: true, childList: true });
}

// 댓글이 동적으로 추가될 때도 처리
const commentObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      if (window.location.href.includes('view')) {
        console.log('댓글 추가 감지, 댓글 처리 시작');
        debouncedProcessComments();
      }
    }
  });
});

// 댓글 목록 감시 시작
function startCommentObserver() {
  console.log('댓글 감시 시작');
  const commentList = document.getElementById('cmt_reply');
  const bestCommentList = document.getElementById('best_cmt_reply');

  [commentList, bestCommentList].forEach(list => {
    if (list) {
      console.log('댓글 목록 감시 설정:', list.id);
      commentObserver.observe(list, {
        childList: true,
        subtree: true
      });
    }
  });
}

// 디바운스 함수 추가
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 댓글 처리 함수를 디바운스 처리
const debouncedProcessComments = debounce(() => {
  console.log('디바운스된 댓글 처리 시작');
  processComments();
}, 100);

// 댓글 처리 함수
async function processComments() {
  // 이미 처리 중인지 확인
  if (window.isProcessingComments) {
    console.log('댓글 처리 중, 중복 호출 방지');
    return;
  }
  
  window.isProcessingComments = true;
  console.log('댓글 처리 시작');
  
  const commentList = document.getElementById('cmt_reply');
  const bestCommentList = document.getElementById('best_cmt_reply');
  
  if (!commentList && !bestCommentList) {
    console.log('댓글 목록을 찾을 수 없음');
    window.isProcessingComments = false;
    return;
  }

  // 메모 데이터를 먼저 가져옴
  const memos = await new Promise(resolve => {
    chrome.storage.local.get('memos', (result) => {
      resolve(result.memos || {});
    });
  });

  // 일반 댓글과 베스트 댓글 모두 처리
  const lists = [commentList, bestCommentList].filter(Boolean);
  
  for (const list of lists) {
    const comments = list.querySelectorAll('li');
    console.log('찾은 댓글 수:', comments.length);
    
    for (const comment of comments) {
      // 이미 처리된 댓글인지 확인
      if (comment.dataset.processed === 'true') continue;
      
      const userSpan = comment.querySelector('span.author');
      if (!userSpan) continue;

      const onclick = userSpan.getAttribute('onclick');
      if (!onclick) continue;

      const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
      if (!match) continue;

      const userId = match[1];
      const commentContent = comment.querySelector('dd');
      if (!commentContent) continue;

      const memoData = memos[userId];
      
      // 모든 댓글의 스타일 초기화
      comment.style.removeProperty('display');
      comment.classList.remove('blocked-comment');
      userSpan.style.removeProperty('color');
      userSpan.style.removeProperty('text-decoration');
      
      if (memoData && memoData.type === 'block') {
        // 댓글에 차단 표시 추가
        comment.classList.add('blocked-comment');
        
        if (memoData.blockType === 'hide') {
          // 게시물 숨기기 옵션일 때는 전체 li를 숨김
          comment.style.display = 'none';
        } else {
          // 취소선으로 표시 옵션일 때는 사용자 이름에 취소선 표시
          userSpan.style.color = '#ff4444';
          userSpan.style.textDecoration = 'line-through';
          
          // 기존 버튼이 있다면 제거
          const existingButton = commentContent.querySelector('.show-blocked-comment');
          if (existingButton) existingButton.remove();
          
          // 원본 댓글 내용 저장
          const originalContent = commentContent.innerHTML;
          
          // 댓글 내용을 숨기고 버튼으로 대체
          commentContent.innerHTML = `
            <div class="show-blocked-comment">차단된 댓글 보기</div>
            <div class="blocked-comment-content" style="display: none;">${originalContent}</div>
          `;
          
          // 버튼 클릭 이벤트 추가
          const showButton = commentContent.querySelector('.show-blocked-comment');
          const contentDiv = commentContent.querySelector('.blocked-comment-content');
          
          showButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = contentDiv.style.display === 'none';
            contentDiv.style.display = isHidden ? 'block' : 'none';
            showButton.textContent = isHidden ? '차단된 댓글 숨기기' : '차단된 댓글 보기';
          };
        }
      } else {
        // 차단 해제된 경우 원래 상태로 복원
        const contentDiv = commentContent.querySelector('.blocked-comment-content');
        if (contentDiv) {
          commentContent.innerHTML = contentDiv.innerHTML;
        }
        commentContent.style.removeProperty('display');
      }
      
      // 댓글 처리 완료 표시
      comment.dataset.processed = 'true';
    }
  }
  
  console.log('댓글 처리 완료');
  window.isProcessingComments = false;
}

// 댓글 스타일 추가
const commentStyle = document.createElement('style');
commentStyle.textContent = `
  .blocked-comment {
    background-color: #fff5f5;
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
    border-left: 3px solid #ff4444;
  }
  .blocked-comment span.author {
    color: #ff4444 !important;
    text-decoration: line-through !important;
  }
  .show-blocked-comment {
    display: inline-block;
    margin: 5px 0;
    padding: 5px 10px;
    background-color: #f8f8f8;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid #ddd;
    color: #666;
    font-size: 12px;
  }
  .show-blocked-comment:hover {
    background-color: #f0f0f0;
  }
  .blocked-comment-content {
    margin-top: 5px;
  }
`;
document.head.appendChild(commentStyle);

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('메시지 수신:', request);
  
  if (request.action === 'refreshMemos') {
    console.log('메모 갱신 요청:', request.userId);
    
    // 해당 사용자의 게시물 강조 표시 갱신
    chrome.storage.local.get('memos', (result) => {
      const memos = result.memos || {};
      const memoData = memos[request.userId];
      
      if (memoData) {
        highlightUserPosts(request.userId);
      } else {
        // 메모가 삭제된 경우 해당 사용자의 게시물 강조 표시 제거
        const posts = document.querySelectorAll('#boardlist > tbody > tr');
        posts.forEach(post => {
          const userLink = post.querySelector('span.author');
          if (userLink) {
            const onclick = userLink.getAttribute('onclick');
            if (onclick) {
              const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
              if (match && match[1] === request.userId) {
                post.classList.remove('memo-highlight', 'hidden-post');
                const titleCell = post.querySelector('td:nth-child(2)');
                if (titleCell) {
                  titleCell.classList.remove('has-memo-title', 'blocked-title', 'recommended-title');
                  const memoContainer = titleCell.querySelector('.memo-container');
                  if (memoContainer) {
                    memoContainer.remove();
                  }
                }
              }
            }
          }
        });
      }

      // 댓글 처리도 갱신 (메모가 있든 없든 항상 실행)
      if (window.location.href.includes('view')) {
        console.log('뷰 페이지에서 댓글 갱신 시작');
        
        // 기존 차단된 댓글 표시 제거
        const blockedComments = document.querySelectorAll('.blocked-comment');
        blockedComments.forEach(comment => {
          comment.classList.remove('blocked-comment');
          const userSpan = comment.querySelector('span.author');
          if (userSpan) {
            userSpan.style.color = '';
            userSpan.style.textDecoration = '';
          }
          const commentContent = comment.querySelector('dd');
          if (commentContent) {
            // 원래 내용 복원
            const contentDiv = commentContent.querySelector('.blocked-comment-content');
            if (contentDiv) {
              commentContent.innerHTML = contentDiv.innerHTML;
            }
            commentContent.style.display = 'block';
          }
          // 처리 완료 표시 제거
          comment.removeAttribute('data-processed');
        });

        // 댓글 목록 다시 처리
        console.log('댓글 목록 재처리 시작');
        // 처리 중 플래그 초기화
        window.isProcessingComments = false;
        // 디바운스된 댓글 처리 호출
        debouncedProcessComments();
      }
      
      // 응답 전송
      sendResponse({ success: true });
    });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
});

// 페이지 로드 후 추가 이벤트 리스너 등록
window.addEventListener('load', () => {
  console.log('페이지 로드 완료');
  checkAllMemos();
  
  // 게시물 목록에 있는 모든 사용자 링크에 이벤트 리스너 추가
  const userLinks = document.querySelectorAll('span.author');
  console.log('찾은 사용자 링크 수:', userLinks.length);
  userLinks.forEach(link => {
    link.addEventListener('click', handleUserLinkClick);
  });

  // 뷰 페이지인 경우 댓글 처리 및 감시 시작
  if (window.location.href.includes('view')) {
    console.log('뷰 페이지 감지, 댓글 처리 및 감시 시작');
    debouncedProcessComments();
    startCommentObserver();
  }
}); 