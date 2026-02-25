import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

class MemberProductivityService {
  static async getAgenda(windowType = "today") {
    const response = await axiosInstance.get(API_PATHS.TASKS.GET_MEMBER_AGENDA(windowType));
    return response.data;
  }

  static async getInsights(range = "7d") {
    const response = await axiosInstance.get(API_PATHS.TASKS.GET_MEMBER_INSIGHTS(range));
    return response.data;
  }

  static async planDay() {
    const response = await axiosInstance.post(API_PATHS.TASKS.PLAN_MEMBER_DAY, {});
    return response.data;
  }

  static async aiAssist(taskId, mode) {
    const response = await axiosInstance.post(API_PATHS.TASKS.AI_ASSIST(taskId), { mode });
    return response.data;
  }
}

export default MemberProductivityService;
