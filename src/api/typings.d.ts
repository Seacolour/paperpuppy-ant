declare namespace API {
  type BaseResponseBoolean_ = {
    code?: number;
    data?: boolean;
    message?: string;
  };

  type BaseResponseListDocumentEmbedding_ = {
    code?: number;
    data?: DocumentEmbedding[];
    message?: string;
  };

  type BaseResponseListPaperInfo_ = {
    code?: number;
    data?: PaperInfo[];
    message?: string;
  };

  type BaseResponseListSessions_ = {
    code?: number;
    data?: Sessions[];
    message?: string;
  };

  type BaseResponseListUserUploadedFiles_ = {
    code?: number;
    data?: UserUploadedFiles[];
    message?: string;
  };

  type BaseResponseLoginUserVO_ = {
    code?: number;
    data?: LoginUserVO;
    message?: string;
  };

  type BaseResponseLong_ = {
    code?: number;
    data?: number;
    message?: string;
  };

  type BaseResponsePageUser_ = {
    code?: number;
    data?: PageUser_;
    message?: string;
  };

  type BaseResponsePageUserVO_ = {
    code?: number;
    data?: PageUserVO_;
    message?: string;
  };

  type BaseResponseSessions_ = {
    code?: number;
    data?: Sessions;
    message?: string;
  };

  type BaseResponseString_ = {
    code?: number;
    data?: string;
    message?: string;
  };

  type BaseResponseUser_ = {
    code?: number;
    data?: User;
    message?: string;
  };

  type BaseResponseUserSubscription_ = {
    code?: number;
    data?: UserSubscription;
    message?: string;
  };

  type BaseResponseUserTokens_ = {
    code?: number;
    data?: UserTokens;
    message?: string;
  };

  type BaseResponseUserUploadedFiles_ = {
    code?: number;
    data?: UserUploadedFiles;
    message?: string;
  };

  type BaseResponseUserVO_ = {
    code?: number;
    data?: UserVO;
    message?: string;
  };

  type BindApplePhoneRequest = {
    appleUserId?: string;
    smsRequest?: SMSGetRequest;
  };

  type BindWechatPhoneRequest = {
    openId?: string;
    smsRequest?: SMSGetRequest;
    unionId?: string;
  };

  type cancelSubscriptionUsingPOSTParams = {
    /** userId */
    userId: number;
  };

  type checkVIPStatusUsingGETParams = {
    /** userId */
    userId: number;
  };

  type createSessionUsingPOSTParams = {
    /** sessionName */
    sessionName: string;
  };

  type deleteFileUsingDELETEParams = {
    /** fileId */
    fileId: string;
    /** userId */
    userId: number;
  };

  type deleteIndexUsingDELETEParams = {
    /** indexName */
    indexName: string;
  };

  type deleteKnowledgeFileUsingDELETE1Params = {
    /** fileId */
    fileId: string;
    /** userId */
    userId: string;
  };

  type deleteKnowledgeFileUsingDELETEParams = {
    /** fileId */
    fileId: string;
  };

  type DeleteRequest = {
    id?: number;
  };

  type deleteSessionUsingPOSTParams = {
    /** sessionId */
    sessionId?: number;
  };

  type DocumentEmbedding = {
    content?: string;
    embedding?: number[];
    fileId?: string;
    id?: string;
    userId?: string;
  };

  type getAppleUserInfoUsingPOSTParams = {
    /** identityToken */
    identityToken: string;
  };

  type getFileUsingGETParams = {
    /** fileId */
    fileId: string;
  };

  type getNoteUsingGETParams = {
    /** sessionId */
    sessionId: number;
  };

  type getPhoneNumberUsingGETParams = {
    phone?: string;
  };

  type getSessionByIdUsingGETParams = {
    /** sessionId */
    sessionId?: number;
  };

  type getSessionMessagesByTimeStampUsingGETParams = {
    /** sessionId */
    sessionId?: number;
    /** timeStamp */
    timeStamp?: string;
  };

  type getSessionMessagesUsingGETParams = {
    /** sessionId */
    sessionId?: number;
  };

  type getTokenStatusUsingGETParams = {
    /** userId */
    userId: number;
  };

  type getUserAllPaperInfosBySearchUsingGETParams = {
    /** searchTitle */
    searchTitle: string;
  };

  type getUserByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getUserVOByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type KnowledgeSearchRequest = {
    fileIds?: string[];
    message?: string;
    topK?: number;
    userId?: string;
  };

  type listUserUploadedFilesUsingGETParams = {
    /** userId */
    userId: number;
  };

  type LoginUserVO = {
    createTime?: string;
    email?: string;
    id?: number;
    openId?: string;
    phone?: string;
    unionId?: string;
    updateTime?: string;
    userAccount?: string;
    userAvatar?: string;
    userName?: string;
    userRole?: string;
    userToken?: string;
  };

  type OrderItem = {
    asc?: boolean;
    column?: string;
  };

  type PageUser_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: User[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUserVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: UserVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PaperInfo = {
    authors?: string;
    createTime?: string;
    id?: number;
    paperId?: string;
    pdfLink?: string;
    published?: string;
    searchTitle?: string;
    summary?: string;
    title?: string;
    updateTime?: string;
    userId?: number;
  };

  type searchAndSaveUsingPOSTParams = {
    /** maxResults */
    maxResults: number;
    /** searchQuery */
    searchQuery: string;
  };

  type sendMessageRPCUsingPOSTParams = {
    /** enableDeepThought */
    enableDeepThought?: boolean;
    /** enableInternet */
    enableInternet?: boolean;
    /** fileIds */
    fileIds?: string[];
    /** fileInfo */
    fileInfo?: string;
    /** message */
    message?: string;
    /** sessionId */
    sessionId: number;
    /** useKnowledge */
    useKnowledge?: boolean;
  };

  type SendSmsResponse = {
    bizId?: string;
    code?: string;
    message?: string;
    requestId?: string;
  };

  type SessionMessages = {
    content?: string;
    createTime?: string;
    id?: number;
    messageType?: string;
    rawContent?: string;
    role?: string;
    sessionId?: number;
    tempId?: string;
  };

  type Sessions = {
    createTime?: string;
    id?: number;
    isActive?: number;
    note?: string;
    sessionName?: string;
    theme?: string;
    updateTime?: string;
    userId?: number;
  };

  type SMSGetRequest = {
    captcha?: string;
    phone?: string;
  };

  type SseEmitter = {
    timeout?: number;
  };

  type submitTranslationTaskUsingPOSTParams = {
    /** fromLang */
    fromLang: string;
    /** toLang */
    toLang: string;
  };

  type SubscriptionRequest = {
    durationDays?: number;
    subscriptionType?: string;
    userId?: number;
  };

  type updateNoteUsingPUTParams = {
    /** sessionId */
    sessionId: number;
  };

  type User = {
    appleId?: string;
    createTime?: string;
    email?: string;
    id?: number;
    isDelete?: number;
    openId?: string;
    phone?: string;
    unionId?: string;
    updateTime?: string;
    userAccount?: string;
    userAvatar?: string;
    userName?: string;
    userPassword?: string;
    userRole?: string;
  };

  type UserAddRequest = {
    userAccount?: string;
    userAvatar?: string;
    userName?: string;
    userRole?: string;
  };

  type userLoginByWxOpenUsingGETParams = {
    /** code */
    code: string;
  };

  type UserLoginRequest = {
    userAccount?: string;
    userPassword?: string;
  };

  type UserQueryRequest = {
    current?: number;
    id?: number;
    mpOpenId?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    unionId?: string;
    userName?: string;
    userRole?: string;
  };

  type UserRegisterRequest = {
    checkPassword?: string;
    email?: string;
    userAccount?: string;
    userPassword?: string;
  };

  type UserSubscription = {
    createTime?: string;
    endTime?: string;
    id?: number;
    isActive?: number;
    startTime?: string;
    subscriptionType?: string;
    updateTime?: string;
    userId?: number;
  };

  type UserTokenRequest = {
    token?: number;
    userId?: number;
  };

  type UserTokens = {
    createTime?: string;
    id?: number;
    isDelete?: number;
    lastUpdated?: string;
    tokens?: number;
    userId?: number;
  };

  type UserUpdateMyRequest = {
    userAvatar?: string;
    userName?: string;
  };

  type UserUpdateRequest = {
    id?: number;
    userAvatar?: string;
    userName?: string;
    userRole?: string;
  };

  type UserUploadedFiles = {
    createTime?: string;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    isDelete?: number;
    updateTime?: string;
    userId?: number;
  };

  type UserVO = {
    createTime?: string;
    id?: number;
    userAvatar?: string;
    userName?: string;
    userRole?: string;
  };

  type wechatCallbackUsingGETParams = {
    /** code */
    code: string;
    /** state */
    state: string;
  };

  type WxLoginRequest = {
    phone?: string;
    userInfo?: WxOAuth2UserInfo;
  };

  type WxOAuth2UserInfo = {
    city?: string;
    country?: string;
    headImgUrl?: string;
    nickname?: string;
    openid?: string;
    privileges?: string[];
    province?: string;
    sex?: number;
    snapshotUser?: number;
    unionId?: string;
  };
}
